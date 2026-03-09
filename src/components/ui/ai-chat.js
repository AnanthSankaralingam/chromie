"use client"

import { useState, useEffect } from "react"
import StreamingChat from "@/components/ui/chat/streaming-chat"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import { useBuilderChat } from "@/components/ui/chat/builder-chat-context"

export default function AIChat({
  projectId,
  projectName,
  autoGeneratePrompt,
  availableFiles,
}) {
  const [conversationTokenTotal, setConversationTokenTotal] = useState(0)
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false)

  const {
    onAutoGenerateComplete,
    onCodeGenerated,
    onFileWritten,
    onGenerationStart,
    onGenerationEnd,
    onOpenCanvas,
    hasGeneratedCode,
    isCanvasOpen,
    chatWidth,
    isProjectReady,
    isOnboardingModalOpen,
    onCodeGenerationStarting,
    onSetInputMessage,
    onSetAddMessageCallback,
    onSetTaskListCallback,
    testSessionLogs,
    onClearTestSessionLogs,
    onVersionHistoryClick,
    userIsPaid = true,
    isStillLoadingPaidPlan = false,
  } = useBuilderChat()

  useEffect(() => {
    setConversationTokenTotal(0)
  }, [projectId])

  return (
    <>
      <StreamingChat
        projectId={projectId}
        projectName={projectName}
        autoGeneratePrompt={autoGeneratePrompt}
        onAutoGenerateComplete={onAutoGenerateComplete}
        onCodeGenerated={onCodeGenerated}
        onFileWritten={onFileWritten}
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
        onSetAddMessageCallback={onSetAddMessageCallback}
        onSetTaskListCallback={onSetTaskListCallback}
        testSessionLogs={testSessionLogs}
        onClearTestSessionLogs={onClearTestSessionLogs}
        flatFiles={availableFiles}
        onVersionHistoryClick={onVersionHistoryClick}
        userIsPaid={userIsPaid}
        isStillLoadingPaidPlan={isStillLoadingPaidPlan}
      />
      <TokenUsageAlert isOpen={showTokenLimitModal} onClose={() => setShowTokenLimitModal(false)} />
    </>
  )
}
