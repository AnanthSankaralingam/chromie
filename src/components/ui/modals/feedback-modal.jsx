"use client"

import { useState } from "react"
import { X, Star, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/forms-and-input/textarea"

export default function FeedbackModal({ isOpen, onClose, onSubmit, projectId, isLoading }) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState("")

  const handleSubmit = async () => {
    if (rating === 0) {
      return // Don't submit if no rating (rating is required)
    }

    try {
      await onSubmit({
        projectId,
        rating: rating,
        feedback: feedback.trim() || null
      })
      
      // Reset form
      setRating(0)
      setFeedback("")
      onClose()
    } catch (error) {
      console.error("Error submitting feedback:", error)
    }
  }

  const handleClose = () => {
    setRating(0)
    setFeedback("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Submit Feedback</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rating Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              How would you rate this extension? <span className="text-red-400">*</span>
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-colors"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-500 hover:text-yellow-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-slate-400 mt-2">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Text Feedback Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Additional feedback (Optional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what you think about the extension, what worked well, or what could be improved..."
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-slate-400 mt-1">
              {feedback.length}/1000 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || rating === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Submitting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Submit Feedback</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
