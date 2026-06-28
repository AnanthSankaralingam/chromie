import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { parseTextList, normalizeGovSearchKeywords } from "@/lib/gov-profiles"
import { normalizeSbirCategories } from "@/lib/gov-sbir-categories"
import {
  bootstrapGovMonitor,
  normalizeGovScheduleTimezone,
} from "@/lib/gov-monitor-bootstrap"
import { isGovOnboardingAdmin } from "@/lib/gov-onboarding-admin"
import { createServiceClient } from "@/lib/supabase/service"

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

function domainFromEmail(email) {
  const [, domain = ""] = normalizeEmail(email).split("@")
  return normalizeDomain(domain)
}

function normalizeDomain(value) {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return ""

  try {
    const withProtocol = raw.includes("://") ? raw : `https://${raw}`
    const hostname = new URL(withProtocol).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .trim()
  }
}

function isValidDomain(domain) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)
}

function isEmailVerified(user) {
  return Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at))
}

function getProvider(user) {
  return (
    user?.app_metadata?.provider ||
    user?.identities?.[0]?.provider ||
    "email"
  )
}

function getDisplayName(user, fallbackEmail) {
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    fallbackEmail.split("@")[0] ||
    fallbackEmail
  )
}

function buildBlankFieldPatch(existingProfile, submitted) {
  const patch = {}
  if (!existingProfile.name && submitted.name) {
    patch.name = submitted.name
  }
  if (
    (!Array.isArray(existingProfile.search_keywords) || existingProfile.search_keywords.length === 0) &&
    submitted.search_keywords.length > 0
  ) {
    patch.search_keywords = submitted.search_keywords
  }
  if (
    (!Array.isArray(existingProfile.naics_codes) || existingProfile.naics_codes.length === 0) &&
    submitted.naics_codes.length > 0
  ) {
    patch.naics_codes = submitted.naics_codes
  }
  if (
    (!Array.isArray(existingProfile.sbir_categories) || existingProfile.sbir_categories.length === 0) &&
    submitted.sbir_categories.length > 0
  ) {
    patch.sbir_categories = submitted.sbir_categories
  }
  if (!String(existingProfile.corporate_overview || "").trim() && submitted.corporate_overview) {
    patch.corporate_overview = submitted.corporate_overview
  }
  return patch
}

async function findGovProfileByDomain(service, domain) {
  const { data, error } = await service
    .from("gov_profiles")
    .select("*")
    .eq("company_domain", domain)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

async function getLinkedGovProfile(service, userId) {
  const { data: existingProfileRow, error: profileLookupError } = await service
    .from("profiles")
    .select("gov_profile_id")
    .eq("id", userId)
    .maybeSingle()

  if (profileLookupError) {
    throw new Error(profileLookupError.message)
  }

  if (!existingProfileRow?.gov_profile_id) {
    return { linkedGovProfile: null, alreadyLinked: false }
  }

  const { data: linkedGovProfile, error: linkedError } = await service
    .from("gov_profiles")
    .select("*")
    .eq("id", existingProfileRow.gov_profile_id)
    .single()

  if (linkedError) {
    throw new Error(linkedError.message)
  }

  return { linkedGovProfile, alreadyLinked: true }
}

async function linkUserToGovProfile(service, user, govProfile) {
  const userEmail = normalizeEmail(user.email)
  const { error: upsertError } = await service
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name: getDisplayName(user, userEmail),
        email: userEmail,
        provider: getProvider(user),
        gov_profile_id: govProfile.id,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

  if (upsertError) {
    throw new Error(upsertError.message)
  }

  return govProfile
}

export const GET = withAuth(async ({ user }) => {
  try {
    const service = createServiceClient()
    if (!service) {
      return NextResponse.json(
        { error: "Server is missing Supabase service credentials." },
        { status: 500 },
      )
    }

    const userEmail = normalizeEmail(user.email)
    const emailDomain = domainFromEmail(userEmail)
    const isAdmin = isGovOnboardingAdmin(userEmail)
    const { linkedGovProfile, alreadyLinked } = await getLinkedGovProfile(service, user.id)

    if (alreadyLinked && !isAdmin) {
      return NextResponse.json({
        status: "already_linked",
        gov_profile: linkedGovProfile,
        email_domain: emailDomain || null,
      })
    }

    if (isAdmin) {
      console.log("[gov-onboarding GET] admin re-onboard allowed", userEmail)
      return NextResponse.json({
        status: "needs_setup",
        is_onboarding_admin: true,
        gov_profile: null,
        email_domain: emailDomain || null,
        currently_linked_profile: alreadyLinked ? linkedGovProfile : null,
      })
    }

    if (!emailDomain || !isValidDomain(emailDomain)) {
      return NextResponse.json({
        status: "needs_setup",
        gov_profile: null,
        email_domain: emailDomain || null,
      })
    }

    const existingGovProfile = await findGovProfileByDomain(service, emailDomain)
    if (existingGovProfile) {
      return NextResponse.json({
        status: "existing_company",
        gov_profile: existingGovProfile,
        email_domain: emailDomain,
      })
    }

    return NextResponse.json({
      status: "needs_setup",
      gov_profile: null,
      email_domain: emailDomain,
    })
  } catch (err) {
    console.error("[gov-onboarding GET]", err)
    return NextResponse.json(
      { error: err.message || "Failed to load onboarding status." },
      { status: 500 },
    )
  }
})

export const POST = withAuth(async ({ request, supabase, user }) => {
  try {
    if (!isEmailVerified(user)) {
      return NextResponse.json(
        { error: "Please verify your email before setting up government onboarding." },
        { status: 400 },
      )
    }

    const body = await request.json()
    const userEmail = normalizeEmail(user.email)
    const emailDomain = domainFromEmail(userEmail)
    const isAdmin = isGovOnboardingAdmin(userEmail)

    const service = createServiceClient()
    if (!service) {
      return NextResponse.json(
        { error: "Server is missing Supabase service credentials." },
        { status: 500 },
      )
    }

    const { linkedGovProfile, alreadyLinked } = await getLinkedGovProfile(service, user.id)
    if (alreadyLinked && !isAdmin) {
      return NextResponse.json({
        gov_profile: linkedGovProfile,
        already_linked: true,
      })
    }

    if (body.link_existing) {
      const targetDomain = isAdmin
        ? normalizeDomain(body.company_domain || body.company_website)
        : emailDomain

      if (!targetDomain || !isValidDomain(targetDomain)) {
        return NextResponse.json(
          {
            error: isAdmin
              ? "Enter a valid company domain to join an existing profile."
              : "Your email domain is not a valid company domain to join an existing profile.",
          },
          { status: 400 },
        )
      }

      const existingGovProfile = await findGovProfileByDomain(service, targetDomain)
      if (!existingGovProfile) {
        return NextResponse.json(
          { error: "No company profile exists for that domain yet." },
          { status: 404 },
        )
      }

      const govProfile = await linkUserToGovProfile(service, user, existingGovProfile)
      console.log(
        "[gov-onboarding] linked existing company",
        userEmail,
        govProfile.id,
        targetDomain,
        isAdmin ? "(admin)" : "",
      )
      return NextResponse.json({
        gov_profile: govProfile,
        linked_existing: true,
        relinked: alreadyLinked && isAdmin,
      })
    }

    const submittedDomain = normalizeDomain(body.company_domain || body.company_website)
    const companyDomain = isAdmin ? submittedDomain : submittedDomain || emailDomain

    if (!companyDomain || !isValidDomain(companyDomain)) {
      return NextResponse.json(
        {
          error: isAdmin
            ? "Enter the target company domain to onboard."
            : "Enter a valid company domain to continue.",
        },
        { status: 400 },
      )
    }

    const companyName = String(body.name || body.company_name || "").trim()
    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 },
      )
    }

    const submittedProfile = {
      name: companyName,
      company_domain: companyDomain,
      search_keywords: normalizeGovSearchKeywords(body.search_keywords),
      naics_codes: parseTextList(body.naics_codes),
      sbir_categories: normalizeSbirCategories(body.sbir_categories),
      corporate_overview: String(body.corporate_overview || "").trim() || null,
    }

    let govProfile = await findGovProfileByDomain(service, companyDomain)
    let linkedExisting = Boolean(govProfile)

    if (!govProfile) {
      const { data: inserted, error: insertError } = await service
        .from("gov_profiles")
        .insert(submittedProfile)
        .select()
        .single()

      if (insertError) {
        if (insertError.code === "23505") {
          govProfile = await findGovProfileByDomain(service, companyDomain)
          linkedExisting = Boolean(govProfile)
        } else {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      } else {
        govProfile = inserted
      }
    }

    if (!govProfile) {
      return NextResponse.json(
        { error: "Could not create or find a company profile for this domain." },
        { status: 500 },
      )
    }

    const blankFieldPatch = buildBlankFieldPatch(govProfile, submittedProfile)
    if (Object.keys(blankFieldPatch).length > 0) {
      const { data: updated, error: updateError } = await service
        .from("gov_profiles")
        .update(blankFieldPatch)
        .eq("id", govProfile.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      govProfile = updated
    }

    await linkUserToGovProfile(service, user, govProfile)

    let monitor = null
    const shouldBootstrap = !body.link_existing && !linkedExisting
    if (shouldBootstrap) {
      try {
        const scheduleTimezone = normalizeGovScheduleTimezone(body.schedule_timezone)
        monitor = await bootstrapGovMonitor({
          supabase,
          service,
          user,
          govProfile,
          timezone: scheduleTimezone,
          mode: "onboarding",
        })
        console.log("[gov-onboarding] monitor bootstrap", govProfile.id, {
          scheduled: monitor.scheduled,
          invoked: monitor.invoked,
          skipped_reason: monitor.skipped_reason,
          next_run_at: monitor.next_run_at,
        })
      } catch (bootstrapErr) {
        console.error("[gov-onboarding] monitor bootstrap failed", bootstrapErr)
        monitor = {
          error: bootstrapErr.message || "Failed to initialize contract search monitoring.",
        }
      }
    }

    console.log(
      "[gov-onboarding] linked",
      userEmail,
      govProfile.id,
      companyDomain,
      isAdmin ? "(admin)" : "",
    )
    return NextResponse.json({
      gov_profile: govProfile,
      linked_existing: linkedExisting,
      relinked: alreadyLinked && isAdmin,
      monitor,
    })
  } catch (err) {
    console.error("[gov-onboarding POST]", err)
    return NextResponse.json(
      { error: err.message || "Failed to complete government onboarding." },
      { status: 500 },
    )
  }
})
