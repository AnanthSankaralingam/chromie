import { useState } from "react";
import { X } from "lucide-react";

export default function GlobalFeedbackModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [feedbackCategory, setFeedbackCategory] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true); // Default to Yes
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate all fields are filled
    if (!feedbackCategory || !feedbackText.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate text length
    if (feedbackText.trim().length < 3) {
      setError("Feedback must be at least 3 characters");
      return;
    }

    if (feedbackText.length > 1000) {
      setError("Feedback must be 1000 characters or less");
      return;
    }

    // Call parent submit handler
    const success = await onSubmit({
      feedback_category: feedbackCategory,
      feedback_text: feedbackText.trim(),
      would_recommend: wouldRecommend,
    });

    if (success) {
      // Show success message
      setShowSuccess(true);

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    // Reset form
    setFeedbackCategory("");
    setFeedbackText("");
    setWouldRecommend(true); // Reset to default Yes
    setShowSuccess(false);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-800/95 border border-slate-700 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        {/* Success Message */}
        {showSuccess ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-xl font-semibold mb-2">
              ✓ Thank you for your feedback!
            </div>
            <p className="text-slate-300">Your input helps us improve Chromie.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <h2 className="text-xl font-bold mb-4 text-white">Share Your Feedback</h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feedback Category */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Feedback Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                >
                  <option value="" className="bg-slate-700">Select a category</option>
                  <option value="bug" className="bg-slate-700">Bug Report</option>
                  <option value="feature" className="bg-slate-700">Feature Request</option>
                  <option value="general" className="bg-slate-700">General Feedback</option>
                  <option value="other" className="bg-slate-700">Other</option>
                </select>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Your Feedback <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-slate-400"
                  rows={5}
                  disabled={isLoading}
                  minLength={3}
                  maxLength={1000}
                  required
                />
                <div className="text-xs text-slate-400 mt-1 text-right">
                  {feedbackText.length}/1000 characters
                </div>
              </div>

              {/* Would Recommend */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Would you recommend Chromie to a friend?
                </label>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${wouldRecommend ? 'text-white font-medium' : 'text-slate-400'}`}>
                    Yes
                  </span>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(!wouldRecommend)}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                      wouldRecommend ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                    aria-label="Toggle recommendation"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        wouldRecommend ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${!wouldRecommend ? 'text-white font-medium' : 'text-slate-400'}`}>
                    No
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? "Submitting..." : "Submit Feedback"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
