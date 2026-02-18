import { Inter } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import SessionProviderClient from "@/components/SessionProviderClient";
import AuthHandler from "@/components/AuthHandler";
import FloatingFeedbackButton from "@/components/ui/floating-feedback-button";
import { ToastProvider, ToastViewport } from "@/components/ui/feedback/toast";
import { Toaster } from "@/lib/hooks/use-toast";

const inter = Inter({ subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
});
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
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
    <html lang="en">
      {/* Apply Inter globally, while still exposing serif/grotesk variables for selective use */}
      <body className={`${inter.className} ${instrumentSerif.variable} ${spaceGrotesk.variable}`}>
        <SessionProviderClient>
          <AuthHandler />
          <ToastProvider>
            {children}
            <FloatingFeedbackButton />
            <Toaster />
            <ToastViewport />
          </ToastProvider>
        </SessionProviderClient>
        <a href="https://foundrlist.com/product/chromiedev" target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
          <img src="https://foundrlist.com/api/badge/chromiedev" alt="Live on FoundrList" width="180" height="72" />
        </a>
      </body>
    </html>
  );
}
