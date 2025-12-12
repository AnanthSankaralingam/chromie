import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderClient from "@/components/SessionProviderClient";
import AuthHandler from "@/components/AuthHandler";
import FloatingFeedbackButton from "@/components/ui/floating-feedback-button";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "chromie - Chrome Extension Builder",
  description: "Build Chrome extensions with AI - no coding required",
  icons: {
    icon: '/chromie-logo-1.png',
  },
  verification: {
    google: 'nAEDWE-ZXwUBJzvqb0DlBWsdtOX5-2xbPODlfoadkPc',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground min-h-screen flex flex-col`}>
        <SessionProviderClient>
          <AuthHandler />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingFeedbackButton />
        </SessionProviderClient>
      </body>
    </html>
  );
}
