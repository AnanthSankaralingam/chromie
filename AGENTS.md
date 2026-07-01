# Chromie dashboard — agent guidance

## Persisted browser login (Browserbase Contexts)

If a feature or page (including future ones like a `chromie.dev/new` onboarding/automation
flow) needs a workflow to **stay logged into a third-party site across scheduled runs**, it
must use a Browserbase persisted **Context**. Detailed guidance is in
`.cursor/rules/browserbase-persisted-context.mdc`; read it before building such a feature.

Two things that silently break persistence:
- **Recreating the context per run/save.** Provision exactly ONE stable id per identity and
  store it on `automations.browserbase_context_id`.
- **Treating "context created" as "logged in."** A new context is an empty cookie jar; it is
  not authenticated until a human completes the first login once in Live View.

Personal automations share ONE **account-level identity context** frozen on
`profiles.browserbase_context_id`: a corporate user inherits the earliest teammate's context for
their work-email domain, a standalone user gets their own (provisioned lazily via the service role
in `ensureProfileBrowserbaseContextId`, `src/lib/new-automation/recording-context.js`). Both the
`chromie.dev/new` recorder AND eviivo (`ensureHospitalityAutomation`) use it, so one login covers
every personal automation for that identity. **Gov monitors are the exception** — org/`gov_profile`
scoped, they keep their **dedicated per-scenario** contexts (separate reset/login lifecycle).

The recording session pins egress (region + Browserbase proxy + viewport) via
`resolveIdentitySessionPinning()` (`BROWSERBASE_IDENTITY_*`, proxies default ON, viewport
`1920x1080`). This is ONE shared pin with eviivo runs; the runner's identity pin reads
`BROWSERBASE_IDENTITY_*` then `BROWSERBASE_EVIIVO_*`. Since chromie (Vercel) and the runner (Lambda)
are separate deployments, set the identity `BROWSERBASE_*` values identically in both (or leave
defaults — they match), or captured cookies get rejected on runs.

Reliability (IP/fingerprint pinning, captcha handling, `/login`→dashboard reload) is handled
runner-side — see the `chromie-runner` / `chromie-tools` rules; don't reinvent it here.
