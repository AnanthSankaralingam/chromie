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
import { usePathname, useRouter } from "next/navigation"

export default function AppBar() {
  const { user } = useSession()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const router = useRouter()

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

  // Handle "Featured creations" click - scroll if on home page, navigate otherwise
  const handleFeaturedCreationsClick = (e) => {
    e.preventDefault()
    if (pathname === '/home') {
      const section = document.getElementById('featured-creations')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      router.push('/home#featured-creations')
    }
  }

  // Handle "Pricing" click - scroll if on home page, navigate otherwise
  const handlePricingClick = (e) => {
    e.preventDefault()
    if (pathname === '/home') {
      // On home page - scroll to section
      const section = document.getElementById('pricing')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // On other page - navigate to home page with hash
      router.push('/home#pricing')
    }
  }

  // Handle "Blog" click - scroll if on home page, navigate otherwise
  const handleBlogClick = (e) => {
    e.preventDefault()
    if (pathname === '/home') {
      // On home page - scroll to section
      const section = document.getElementById('blog')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // On other page - navigate to home page with hash
      router.push('/home#blog')
    }
  }

  // Handle "Contact" click - scroll if on home page, navigate otherwise
  const handleContactClick = (e) => {
    e.preventDefault()
    if (pathname === '/home') {
      // On home page - scroll to section
      const section = document.getElementById('contact')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // On other page - navigate to home page with hash
      router.push('/home#contact')
    }
  }

  return (
    <>
      <header className="border-b border-white/10 px-6 py-4 bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={user ? "/home" : "/"} className="flex items-center gap-2 transition-colors [&>span]:hover:opacity-90">
            <Image src="/chromie-logo-1.png" alt="Chromie" width={32} height={32} className="shrink-0 opacity-90 hover:opacity-100" />
            <span className="inline-block text-xl">
              <span className="font-bold bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">chromie</span>
              <span className="font-normal text-gray-500">.dev</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center space-x-6">
              <a
                href="#featured-creations"
                onClick={handleFeaturedCreationsClick}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                gallery
              </a>
              <a
                href="#pricing"
                onClick={handlePricingClick}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                pricing
              </a>
              <a
                href="#blog"
                onClick={handleBlogClick}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                blog
              </a>
              <a
                href="#contact"
                onClick={handleContactClick}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                contact
              </a>
            </nav>

            <div className="flex items-center space-x-3">
              <button
                className="md:hidden p-2 text-slate-300 hover:text-white"
                aria-label="Open menu"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              {user ? (
                <Link href="/profile">
                  <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage
                      src={user?.user_metadata?.picture}
                      alt={user?.user_metadata?.name || user?.email}
                    />
                    <AvatarFallback className="bg-white text-slate-900 text-sm font-medium">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
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
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 mt-3 pt-3 px-2">
            <div className="flex flex-col space-y-3">
              <a
                href="#featured-creations"
                onClick={(e) => {
                  handleFeaturedCreationsClick(e)
                  setIsMobileMenuOpen(false)
                }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                gallery
              </a>
              <a
                href="#pricing"
                onClick={(e) => {
                  handlePricingClick(e)
                  setIsMobileMenuOpen(false)
                }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                pricing
              </a>
              <a
                href="#blog"
                onClick={(e) => {
                  handleBlogClick(e)
                  setIsMobileMenuOpen(false)
                }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                blog
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  handleContactClick(e)
                  setIsMobileMenuOpen(false)
                }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                contact
              </a>
              {!user && (
                <>
                  <Button
                    variant="outline"
                    className="justify-start border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
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
              {/* Dashboard button removed from mobile menu */}
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