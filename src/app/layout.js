import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderClient from "@/components/SessionProviderClient";
import AuthHandler from "@/components/AuthHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Chromie AI - Chrome Extension Builder",
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
      <body className={inter.className}>
        <SessionProviderClient>
          <AuthHandler />
          {children}
        </SessionProviderClient>
      </body>
    </html>
  );
}
