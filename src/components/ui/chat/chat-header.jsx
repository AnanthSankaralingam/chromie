"use client"

import Image from "next/image"

export default function ChatHeader() {
  return (
    <div className="p-4 border-b border-white/10">
      <h3 className="text-lg font-semibold mb-1 flex items-center">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden mr-2">
          <Image 
            src="/chromie-logo-1.png" 
            alt="chromie Logo" 
            width={32} 
            height={32}
            className="object-contain"
          />
        </div>
        chromie
      </h3>
    </div>
  )
} 