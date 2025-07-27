"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Zap, Download, TestTube, LogOut } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'

export default function AppBarBuilder({ 
  onTestExtension, 
  onDownloadZip, 
  onSignOut, 
  isTestDisabled = false,
  isGenerating = false 
}) {
  const { user } = useSession()

  // Helper function to get user initials
  const getUserInitials = (user) => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="border-b border-white/10 px-4 py-3 bg-black/20 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <Link href="/" className="text-xl font-bold">chromie ai</Link>
          </div>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
            extension builder assistant
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {user && (
            <>
              <Link href="/profile">
                <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarImage 
                    src={user?.user_metadata?.picture} 
                    alt={user?.user_metadata?.name || user?.email}
                  />
                  <AvatarFallback className="bg-purple-600 text-white text-sm font-medium">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button
                onClick={onTestExtension}
                disabled={isTestDisabled || isGenerating}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <TestTube className="h-4 w-4 mr-2" />
                test extension
              </Button>
              <Button onClick={onDownloadZip} className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                download zip
              </Button>
              <Button onClick={onSignOut} variant="ghost" className="text-slate-400 hover:text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
} 