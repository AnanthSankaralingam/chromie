"use client"

import { useState, useEffect } from "react"
import StreamingChat from "@/components/ui/chat/streaming-chat"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"

export default function AIChat({ projectId, projectName, autoGeneratePrompt, onAutoGenerateComplete, onCodeGenerated, onGenerationStart, onGenerationEnd, onOpenCanvas, hasGeneratedCode, isCanvasOpen, isProjectReady, isOnboardingModalOpen }) {
  const [previousResponseId, setPreviousResponseId] = useState(null)
  const [conversationTokenTotal, setConversationTokenTotal] = useState(0)
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)

  useEffect(() => {
    // Reset on navigation/refresh: local-only state
    setPreviousResponseId(null)
    setConversationTokenTotal(0)
    console.log('[client/ai-chat] reset conversation state')
  }, [projectId])

  return (
    <>
      <StreamingChat
        projectId={projectId}
        projectName={projectName}
        autoGeneratePrompt={autoGeneratePrompt}
        onAutoGenerateComplete={onAutoGenerateComplete}
        onCodeGenerated={onCodeGenerated}
        onGenerationStart={onGenerationStart}
        onGenerationEnd={onGenerationEnd}
        onOpenCanvas={onOpenCanvas}
        hasGeneratedCode={hasGeneratedCode}
        isCanvasOpen={isCanvasOpen}
        isProjectReady={isProjectReady}
        isOnboardingModalOpen={isOnboardingModalOpen}
        previousResponseId={previousResponseId}
        setPreviousResponseId={setPreviousResponseId}
        conversationTokenTotal={conversationTokenTotal}
        setConversationTokenTotal={setConversationTokenTotal}
        onShowTokenLimitModal={() => setShowTokenLimitModal(true)}
      />
      <TokenUsageAlert isOpen={showTokenLimitModal} onClose={() => setShowTokenLimitModal(false)} />
    </>
  )
}
