"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navbar() {
     const pathname = usePathname();
     const [isOpen, setIsOpen] = useState(false);

     // Don't show navbar on builder page
     if (pathname?.startsWith('/builder')) {
          return null;
     }

     const navLinks = [
          { name: "Features", href: "/#features" },
          { name: "Pricing", href: "/pricing" },
     ];

     return (
          <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
               <nav className="flex items-center justify-between w-full max-w-5xl px-6 py-3 bg-background/80 backdrop-blur-md border border-border/40 shadow-sm rounded-full pointer-events-auto">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                         <span className="text-xl font-bold tracking-tight text-foreground">chromie</span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                         {navLinks.map((link) => (
                              <Link
                                   key={link.name}
                                   href={link.href}
                                   className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                              >
                                   {link.name}
                              </Link>
                         ))}
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center gap-4">
                         <Link href="/auth?mode=signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                              Sign In
                         </Link>
                         <Link href="/auth?mode=signup">
                              <button className="btn-primary rounded-full px-6 py-2.5 h-auto text-sm">
                                   Get Started
                              </button>
                         </Link>
                    </div>

                    {/* Mobile Menu */}
                    <div className="md:hidden">
                         <Sheet open={isOpen} onOpenChange={setIsOpen}>
                              <SheetTrigger asChild>
                                   <Button variant="ghost" size="icon" className="rounded-full">
                                        <Menu className="h-5 w-5" />
                                   </Button>
                              </SheetTrigger>
                              <SheetContent side="top" className="w-full pt-20 rounded-b-3xl">
                                   <div className="flex flex-col items-center gap-6">
                                        {navLinks.map((link) => (
                                             <Link
                                                  key={link.name}
                                                  href={link.href}
                                                  onClick={() => setIsOpen(false)}
                                                  className="text-lg font-medium text-muted-foreground hover:text-foreground"
                                             >
                                                  {link.name}
                                             </Link>
                                        ))}
                                        <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
                                             <Link href="/auth?mode=signin" onClick={() => setIsOpen(false)}>
                                                  <Button variant="outline" className="w-full rounded-full">Sign In</Button>
                                             </Link>
                                             <Link href="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                                                  <button className="btn-primary w-full rounded-full py-3">Get Started</button>
                                             </Link>
                                        </div>
                                   </div>
                              </SheetContent>
                         </Sheet>
                    </div>
               </nav>
          </div>
     );
}
