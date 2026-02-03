"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "@/components/SessionProviderClient"
import DeploymentLayout from "@/components/ui/deployment/deployment-layout"
import Step1Download from "@/components/ui/deployment/step-1-download"
import Step2Description from "@/components/ui/deployment/step-2-description"
import Step3Assets from "@/components/ui/deployment/step-3-assets"
import Step4Permissions from "@/components/ui/deployment/step-4-permissions"
import Step5Privacy from "@/components/ui/deployment/step-5-privacy"

export default function DeploymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading, supabase } = useSession()

  const projectId = searchParams.get("project")

  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [projectData, setProjectData] = useState(null)
  const [generatedData, setGeneratedData] = useState({
    description: null,
    permissionJustifications: null,
    privacyPolicyText: null,
    privacyPolicySlug: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Verify project ownership and load data
  useEffect(() => {
    if (!projectId) {
      setError("No project ID provided")
      setIsLoading(false)
      return
    }

    if (authLoading) {
      return
    }

    if (!user) {
      setIsLoading(false)
      return
    }

    const loadProjectData = async () => {
      try {
        const { data, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .eq("user_id", user.id)
          .single()

        if (projectError || !data) {
          throw new Error("Failed to load project")
        }

        setProjectData(data)

        // Check if privacy policy already exists
        if (data.privacy_slug) {
          setGeneratedData((prev) => ({
            ...prev,
            privacyPolicySlug: data.privacy_slug,
          }))
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error loading project:", err)
        setError(err.message)
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId, user, authLoading, supabase])

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 5) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep))
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (step) => {
    if (step >= 1 && step <= 5) {
      setCurrentStep(step)
    }
  }

  const handleStepComplete = (step) => {
    setCompletedSteps((prev) => new Set(prev).add(step))
  }

  // Update generated data
  const updateGeneratedData = (key, value) => {
    setGeneratedData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Step configurations
  const steps = [
    {
      title: "Download & Upload",
      description:
        "Download your extension package and upload it to the Chrome Web Store Developer Dashboard.",
    },
    {
      title: "Store Description",
      description:
        "Create a compelling description for your Chrome Web Store listing (max 132 characters).",
    },
    {
      title: "Promotional Assets",
      description: "Upload and resize promotional images for your extension listing.",
    },
    {
      title: "Permission Justifications",
      description: "Explain why your extension needs each requested permission.",
    },
    {
      title: "Privacy Policy",
      description:
        "Generate and host a privacy policy for your extension (required by Chrome Web Store).",
    },
  ]

  // Loading and error states
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading deployment wizard...</p>
        </div>
      </div>
    )
  }

  if (error || !projectId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-zinc-400 mb-6">{error || "Invalid project ID"}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-zinc-400 mb-6">Please sign in to deploy your extension.</p>
        </div>
      </div>
    )
  }

  const currentStepConfig = steps[currentStep - 1]

  return (
    <DeploymentLayout
      currentStep={currentStep}
      totalSteps={5}
      stepTitle={currentStepConfig.title}
      stepDescription={currentStepConfig.description}
      onBack={handleBack}
      onNext={handleNext}
      onStepClick={handleStepClick}
      canGoBack={currentStep > 1}
      canGoNext={true}
      nextLabel={currentStep === 5 ? "Complete" : "Next"}
      projectId={projectId}
    >
      {currentStep === 1 && (
        <Step1Download
          projectId={projectId}
          onComplete={() => handleStepComplete(1)}
        />
      )}

      {currentStep === 2 && (
        <Step2Description
          projectId={projectId}
          projectData={projectData}
          generatedDescription={generatedData.description}
          onDescriptionGenerated={(desc) => updateGeneratedData("description", desc)}
          onComplete={() => handleStepComplete(2)}
        />
      )}

      {currentStep === 3 && (
        <Step3Assets
          projectId={projectId}
          projectData={projectData}
          onComplete={() => handleStepComplete(3)}
        />
      )}

      {currentStep === 4 && (
        <Step4Permissions
          projectId={projectId}
          projectData={projectData}
          generatedJustifications={generatedData.permissionJustifications}
          onJustificationsGenerated={(justifications) =>
            updateGeneratedData("permissionJustifications", justifications)
          }
          onComplete={() => handleStepComplete(4)}
        />
      )}

      {currentStep === 5 && (
        <Step5Privacy
          projectId={projectId}
          projectData={projectData}
          existingSlug={generatedData.privacyPolicySlug}
          onPolicyGenerated={(slug, text) => {
            updateGeneratedData("privacyPolicySlug", slug)
            updateGeneratedData("privacyPolicyText", text)
          }}
          onComplete={() => handleStepComplete(5)}
        />
      )}
    </DeploymentLayout>
  )
}
