"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Github } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import AuthModal from "@/components/ui/modals/modal-auth"
import { useState } from "react"

export default function AppBar() {
  const { user } = useSession()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

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
    <>
      <header className="border-b border-white/10 px-6 py-4 bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                <Image 
                  src="/chromie-logo-1.png" 
                  alt="Chromie AI Logo" 
                  width={20} 
                  height={20}
                />
              </Link>
            </div>
            <Link href="/" className="text-xl font-bold text-white">chromie ai</Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/about" className="text-slate-300 hover:text-white transition-colors">
              how it works
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
              pricing
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
            </div>
            {user ? (
              <div className="flex items-center space-x-3">
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
                <Link href="/builder">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">dashboard</Button>
                </Link>
              </div>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-slate-300 hover:text-white"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  sign in
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  )
} 