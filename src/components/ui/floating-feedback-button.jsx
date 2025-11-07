"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionProviderClient";
import AuthModal from "@/components/ui/modals/modal-auth";
import GlobalFeedbackModal from "@/components/ui/modals/global-feedback-modal";

export default function FloatingFeedbackButton() {
  const { user } = useSession();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  // Don't show on share extension page
  if (pathname?.startsWith("/share/")) {
    return null;
  }

  const handleButtonClick = () => {
    // Capture current page URL
    setPageUrl(window.location.href);

    // Check if user is authenticated
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsFeedbackModalOpen(true);
    }
  };

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
  };

  const handleFeedbackModalClose = () => {
    setIsFeedbackModalOpen(false);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...feedbackData,
          page_url: pageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error submitting feedback:", data.error);
        // Let the modal handle error display by returning false
        setIsSubmitting(false);
        return false;
      }

      // Hide button for the rest of the session
      setIsVisible(false);
      setIsSubmitting(false);
      return true;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setIsSubmitting(false);
      return false;
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Don't render if button is not visible
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Button - Hidden on mobile (below sm breakpoint) */}
      <div className="hidden sm:block fixed bottom-3 right-3 md:bottom-5 md:right-5 lg:bottom-6 lg:right-6 z-40">
        <div className="relative">
          {/* Dismiss button - positioned at top right of feedback button */}
          <button
            onClick={handleDismiss}
            className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-full w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center shadow-md transition-colors z-10"
            aria-label="Dismiss feedback button"
          >
            <span className="text-[8px] md:text-[10px] lg:text-xs leading-none">✕</span>
          </button>

          {/* Feedback button - very small on tablets, progressively larger */}
          <button
            onClick={handleButtonClick}
            className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-full p-1.5 md:p-2.5 lg:p-3.5 shadow-lg transition-all hover:scale-105 flex items-center gap-1 md:gap-1.5 lg:gap-2 border border-slate-600"
            aria-label="Send feedback"
          >
            <span className="text-sm md:text-lg lg:text-2xl">💭</span>
            <span className="hidden xl:inline text-sm">Got Feedback?</span>
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        redirectUrl={window.location.pathname}
      />

      {/* Feedback Modal */}
      <GlobalFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={handleFeedbackModalClose}
        onSubmit={handleFeedbackSubmit}
        isLoading={isSubmitting}
      />
    </>
  );
}
