import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Chromie AI - Build Chrome Extensions Without Code",
  description:
    "Create powerful Chrome extensions using AI. No coding experience required - just describe what you want to build.",
  keywords: "chrome extension, no-code, AI, extension builder, browser extension",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
