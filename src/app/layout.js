import { Inter } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import SessionProviderClient from "@/components/SessionProviderClient";
import AuthHandler from "@/components/AuthHandler";

const inter = Inter({ subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
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
      <body className={`${inter.className} ${instrumentSerif.variable}`}>
        <SessionProviderClient>
          <AuthHandler />
          {children}
        </SessionProviderClient>
      </body>
    </html>
  );
}
