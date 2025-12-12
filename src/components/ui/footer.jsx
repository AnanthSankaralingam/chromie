import Link from "next/link";

export default function Footer() {
     return (
          <footer className="w-full py-12 mt-auto bg-background border-t border-border/40">
               <div className="container-width">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                         <div className="col-span-2 md:col-span-1">
                              <Link href="/" className="text-xl font-bold tracking-tight text-foreground mb-4 block">
                                   chromie
                              </Link>
                              <p className="text-sm text-muted-foreground max-w-xs">
                                   Build Chrome extensions with AI. No coding required.
                              </p>
                         </div>

                         <div>
                              <h3 className="font-semibold mb-4 text-sm">Product</h3>
                              <ul className="space-y-3">
                                   <li><Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
                                   <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                                   <li><Link href="/builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Builder</Link></li>
                              </ul>
                         </div>

                         <div>
                              <h3 className="font-semibold mb-4 text-sm">Resources</h3>
                              <ul className="space-y-3">
                                   <li><Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
                                   <li><Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
                                   <li><Link href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Community</Link></li>
                              </ul>
                         </div>

                         <div>
                              <h3 className="font-semibold mb-4 text-sm">Legal</h3>
                              <ul className="space-y-3">
                                   <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                                   <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                              </ul>
                         </div>
                    </div>

                    <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
                         <p className="text-sm text-muted-foreground">
                              © {new Date().getFullYear()} Chromie. All rights reserved.
                         </p>
                         <div className="flex items-center gap-6">
                              {/* Social links could go here */}
                         </div>
                    </div>
               </div>
          </footer>
     );
}
