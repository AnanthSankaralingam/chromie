"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

const CONTENT_WIDTH = 320
const CONTENT_HEIGHT = 190
const PADDING = 16
const DEFAULT_STORAGE_KEY = "chromie_builder_tour_completed"

const TourContext = createContext(null)

const getElementPosition = (id) => {
  if (typeof document === "undefined") return null
  const el = document.getElementById(id)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

const calculateContentPosition = (elementPos, position = "bottom") => {
  if (!elementPos) return { top: PADDING, left: PADDING, width: CONTENT_WIDTH, height: CONTENT_HEIGHT }
  let left = elementPos.left
  let top = elementPos.top
  switch (position) {
    case "top":
      top = elementPos.top - CONTENT_HEIGHT - PADDING
      left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2
      break
    case "bottom":
      top = elementPos.top + elementPos.height + PADDING
      left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2
      break
    case "left":
      left = elementPos.left - CONTENT_WIDTH - PADDING
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2
      break
    case "right":
      left = elementPos.left + elementPos.width + PADDING
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2
      break
  }
  return {
    top,
    left,
    width: CONTENT_WIDTH,
    height: CONTENT_HEIGHT,
  }
}

export function TourProvider({ children, onComplete, storageKey = DEFAULT_STORAGE_KEY }) {
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [elementPosition, setElementPosition] = useState(null)
  const [isTourCompleted, setIsTourCompleted] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem(storageKey) === "1"
    } catch (e) {
      console.warn("[tour] failed to read tour flag", e)
      return false
    }
  })

  const updateElementPosition = useCallback(() => {
    if (currentStep < 0 || currentStep >= steps.length) return
    const pos = getElementPosition(steps[currentStep]?.selectorId || "")
    if (pos) setElementPosition(pos)
  }, [currentStep, steps])

  useEffect(() => {
    updateElementPosition()
  }, [currentStep, steps, updateElementPosition])

  useEffect(() => {
    if (currentStep < 0) return
    const handler = () => updateElementPosition()
    window.addEventListener("resize", handler)
    window.addEventListener("scroll", handler, true)
    return () => {
      window.removeEventListener("resize", handler)
      window.removeEventListener("scroll", handler, true)
    }
  }, [currentStep, updateElementPosition])

  const startTour = useCallback(() => {
    if (!steps.length || isTourCompleted) return
    setCurrentStep(0)
  }, [isTourCompleted, steps.length])

  const completeStepById = useCallback(
    (stepId) => {
      if (currentStep < 0 || currentStep >= steps.length) return
      const active = steps[currentStep]
      const activeId = active?.id || active?.selectorId
      if (stepId && activeId && stepId !== activeId) return

      const isLast = currentStep === steps.length - 1
      if (isLast) {
        setCurrentStep(-1)
        setIsTourCompleted(true)
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, "1")
          }
        } catch (e) {
          console.warn("[tour] failed to set completion flag", e)
        }
        onComplete?.()
        return
      }
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    },
    [currentStep, onComplete, steps, storageKey]
  )

  const nextStep = useCallback(() => {
    if (currentStep < 0 || currentStep >= steps.length) return
    const isLast = currentStep === steps.length - 1
    if (isLast) {
      setCurrentStep(-1)
      setIsTourCompleted(true)
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, "1")
        }
      } catch (e) {
        console.warn("[tour] failed to set completion flag", e)
      }
      onComplete?.()
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }, [currentStep, onComplete, steps.length, storageKey])

  const skipTour = useCallback(() => {
    setCurrentStep(-1)
    setIsTourCompleted(true)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, "1")
      }
    } catch (e) {
      console.warn("[tour] failed to set completion flag", e)
    }
    onComplete?.()
  }, [onComplete, storageKey])

  const contextValue = useMemo(
    () => ({
      steps,
      setSteps,
      currentStep,
      startTour,
      completeStepById,
      isActive: currentStep >= 0,
      isTourCompleted,
      nextStep,
      skipTour,
      activeStep: currentStep >= 0 ? steps[currentStep] : null,
    }),
    [completeStepById, currentStep, isTourCompleted, nextStep, setSteps, skipTour, startTour, steps]
  )

  const activeStep = currentStep >= 0 ? steps[currentStep] : null
  const contentPosition = activeStep ? calculateContentPosition(elementPosition, activeStep.position) : null

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <AnimatePresence>
        {currentStep >= 0 && activeStep && elementPosition && (
          <>
            {/* Visual overlay with cutout */}
            <motion.div
              key="tour-dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px] pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%,
                  0% 100%,
                  100% 100%,
                  100% 0%,

                  ${elementPosition.left}px 0%,
                  ${elementPosition.left}px ${elementPosition.top}px,
                  ${elementPosition.left + (activeStep?.width || elementPosition.width)}px ${elementPosition.top}px,
                  ${elementPosition.left + (activeStep?.width || elementPosition.width)}px ${
                elementPosition.top + (activeStep?.height || elementPosition.height)
              }px,
                  ${elementPosition.left}px ${elementPosition.top + (activeStep?.height || elementPosition.height)}px,
                  ${elementPosition.left}px 0%
                )`,
              }}
            />

            {/* Blocking overlays - four rectangles around the highlighted element */}
            {/* Top blocker */}
            <motion.div
              key="tour-blocker-top"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[90]"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: elementPosition.top,
                pointerEvents: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            />
            {/* Bottom blocker */}
            <motion.div
              key="tour-blocker-bottom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[90]"
              style={{
                top: elementPosition.top + (activeStep?.height || elementPosition.height),
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            />
            {/* Left blocker */}
            <motion.div
              key="tour-blocker-left"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[90]"
              style={{
                top: elementPosition.top,
                left: 0,
                width: elementPosition.left,
                height: activeStep?.height || elementPosition.height,
                pointerEvents: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            />
            {/* Right blocker */}
            <motion.div
              key="tour-blocker-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[90]"
              style={{
                top: elementPosition.top,
                left: elementPosition.left + (activeStep?.width || elementPosition.width),
                right: 0,
                height: activeStep?.height || elementPosition.height,
                pointerEvents: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            />

            {/* Center blocker - only shown on steps > 0 to block the highlighted element */}
            {currentStep > 0 && (
              <motion.div
                key="tour-blocker-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed z-[91] rounded-lg"
                style={{
                  top: elementPosition.top,
                  left: elementPosition.left,
                  width: activeStep?.width || elementPosition.width,
                  height: activeStep?.height || elementPosition.height,
                  pointerEvents: 'auto',
                  cursor: 'not-allowed',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
              />
            )}

            <motion.div
              key="tour-highlight"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed z-[92] border-2 border-purple-400/80 shadow-[0_0_0_8px_rgba(168,85,247,0.12)] rounded-lg pointer-events-none"
              style={{
                top: elementPosition.top,
                left: elementPosition.left,
                width: activeStep?.width || elementPosition.width,
                height: activeStep?.height || elementPosition.height,
              }}
            />

            {contentPosition && (
              <motion.div
                key="tour-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed z-[95] max-w-[340px]"
                style={{
                  top: Math.max(contentPosition.top, PADDING),
                  left: Math.max(contentPosition.left, PADDING),
                  width: CONTENT_WIDTH,
                }}
              >
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-950 to-slate-900 shadow-xl shadow-purple-900/30 ring-1 ring-purple-500/20 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 pr-4">
                      {activeStep?.title && <h3 className="text-sm font-semibold text-white">{activeStep.title}</h3>}
                      <div className="text-sm text-slate-300 leading-relaxed">{activeStep?.content}</div>
                    </div>
                    <div className="text-xs text-slate-400">Step {currentStep + 1} / {steps.length}</div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={skipTour}
                      className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4"
                      type="button"
                    >
                      Skip tour
                    </button>
                    <div className="flex items-center space-x-2">
                      {currentStep > 0 && (
                        <button
                          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                          className="text-xs px-3 py-1 rounded-md border border-white/10 bg-slate-800/70 text-slate-200 hover:bg-slate-700/70 transition-colors"
                          type="button"
                        >
                          Back
                        </button>
                      )}
                      <button
                        onClick={nextStep}
                        className="text-xs px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                        type="button"
                      >
                        {currentStep === steps.length - 1 ? "Finish" : "Next"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  )
}

export const useTour = () => {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider")
  }
  return ctx
}

export const TOUR_STEP_IDS = {
  OPEN_CANVAS: "tour-open-canvas",
  SEE_HTML: "tour-see-html",
  TEST: "tour-test",
  TEST_WITH_AI: "tour-test-with-ai",
  SHARE: "tour-share",
}

