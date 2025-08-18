"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Zap, Download, TestTube, LogOut, Sparkles, Code2 } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'

export default function AppBarBuilder({ 
  onTestExtension, 
  onDownloadZip, 
  onSignOut, 
  isTestDisabled = false,
  isDownloadDisabled = false,
  isGenerating = false,
  isDownloading = false
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
    <header className="border-b border-white/10 px-6 py-4 bg-gradient-to-r from-slate-900/95 via-purple-900/20 to-slate-900/95 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent hover:from-purple-300 hover:to-blue-300 transition-all duration-300">
                chromie ai
              </Link>
              <span className="text-xs text-slate-400 font-medium tracking-wide">EXTENSION BUILDER</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full opacity-60"></div>
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-300 border-purple-500/30 px-3 py-1 text-sm font-medium">
              <Code2 className="h-3 w-3 mr-1.5" />
              AI-Powered Development
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {user && (
            <>
              <div className="hidden sm:flex items-center space-x-3">
                <Button
                  onClick={onTestExtension}
                  disabled={isTestDisabled || isGenerating}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 px-4 py-2 font-medium"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Extension
                </Button>
                <Button 
                  onClick={onDownloadZip} 
                  disabled={isDownloadDisabled || isDownloading}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 transition-all duration-200 px-4 py-2 font-medium"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    "Download ZIP"
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
                <Link href="/profile">
                  <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-purple-400/50 transition-all duration-200 shadow-lg">
                    <AvatarImage 
                      src={user?.user_metadata?.picture} 
                      alt={user?.user_metadata?.name || user?.email}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm font-bold">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button 
                  onClick={onSignOut} 
                  variant="ghost" 
                  className="text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 p-2"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
} 