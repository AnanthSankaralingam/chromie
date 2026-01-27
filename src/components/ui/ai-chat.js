"use client"

import { useState, useEffect } from "react"
import StreamingChat from "@/components/ui/chat/streaming-chat"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"

export default function AIChat({ projectId, projectName, autoGeneratePrompt, onAutoGenerateComplete, onCodeGenerated, onGenerationStart, onGenerationEnd, onOpenCanvas, hasGeneratedCode, isCanvasOpen, chatWidth, isProjectReady, isOnboardingModalOpen, onCodeGenerationStarting, onSetInputMessage, testSessionLogs, onClearTestSessionLogs }) {
  const [conversationTokenTotal, setConversationTokenTotal] = useState(0)
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)

  useEffect(() => {
    // Reset on navigation/refresh: local-only state
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
        chatWidth={chatWidth}
        isProjectReady={isProjectReady}
        isOnboardingModalOpen={isOnboardingModalOpen}
        conversationTokenTotal={conversationTokenTotal}
        setConversationTokenTotal={setConversationTokenTotal}
        onShowTokenLimitModal={() => setShowTokenLimitModal(true)}
        onCodeGenerationStarting={onCodeGenerationStarting}
        onSetInputMessage={onSetInputMessage}
        testSessionLogs={testSessionLogs}
        onClearTestSessionLogs={onClearTestSessionLogs}
      />
      <TokenUsageAlert isOpen={showTokenLimitModal} onClose={() => setShowTokenLimitModal(false)} />
    </>
  )
}
