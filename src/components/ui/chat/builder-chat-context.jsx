 "use client"

import { createContext, useContext } from "react"

// Context for builder-specific chat orchestration (side effects, UI wiring, etc.)
const BuilderChatContext = createContext(null)

export function BuilderChatProvider({ value, children }) {
  return (
    <BuilderChatContext.Provider value={value}>
      {children}
    </BuilderChatContext.Provider>
  )
}

export function useBuilderChat() {
  const ctx = useContext(BuilderChatContext)
  if (!ctx) {
    throw new Error("useBuilderChat must be used within a BuilderChatProvider")
  }
  return ctx
}

