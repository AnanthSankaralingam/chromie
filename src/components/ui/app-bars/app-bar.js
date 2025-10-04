"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Github, Menu, X } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import AuthModal from "@/components/ui/modals/modal-auth"
import { useState } from "react"
import { useIsMobile } from "@/hooks"

export default function AppBar() {
  const { user } = useSession()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

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
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                  <Image 
                    src="/chromie-logo-1.png" 
                    alt="Chromie AI Logo" 
                    width={40} 
                    height={40}
                    className="object-contain"
                  />
                </Link>
              </div>
            </div>
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent hover:from-purple-300 hover:to-blue-300 transition-all duration-300">chromie</Link>
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
            <button
              className="md:hidden p-2 text-slate-300 hover:text-white"
              aria-label="Open menu"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
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
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 mt-3 pt-3 px-2">
            <div className="flex flex-col space-y-3">
              <Link href="/about" className="text-slate-300 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                how it works
              </Link>
              <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                pricing
              </Link>
              {!user && (
                <>
                  <Button 
                    variant="ghost" 
                    className="justify-start text-slate-300 hover:text-white"
                    onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false) }}
                  >
                    sign in
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false) }}
                  >
                    get started
                  </Button>
                </>
              )}
              {user && (
                <Link href="/builder" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">dashboard</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  )
} 