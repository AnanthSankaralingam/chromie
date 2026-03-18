"use client"

import StreamingChat from "@/components/ui/chat/streaming-chat"

export default function AIChat({
  projectId,
  projectName,
  autoGeneratePrompt,
  availableFiles,
}) {
  return (
    <StreamingChat
      projectId={projectId}
      projectName={projectName}
      autoGeneratePrompt={autoGeneratePrompt}
      flatFiles={availableFiles}
    />
  )
}
