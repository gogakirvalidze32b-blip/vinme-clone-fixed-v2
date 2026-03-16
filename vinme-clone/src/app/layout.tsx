import { Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import MessageToast from "@/components/MessageToast";
import type { Metadata, Viewport } from 'next';

// 1. ფონტის კონფიგურაცია
const notoGeo = Noto_Sans_Georgian({
  subsets: ["georgian"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-brand",
});

// 2. მეტამონაცემები (მანიფესტი აქ ჩაიწერა, ცალკე ლინკი აღარ გინდა)
export const metadata: Metadata = {
  title: "შეხვდი",
  description: "Dating app",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json",
};

// 3. ვიუპორტის კონფიგურაცია
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content', 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoGeo.variable}>
      <body className="min-h-screen bg-black text-white antialiased">
        <Providers>
          {/* შეტყობინებების კომპონენტი */}
          <MessageToast /> 
          
          {children}
        </Providers>
      </body>
    </html>
  );
}