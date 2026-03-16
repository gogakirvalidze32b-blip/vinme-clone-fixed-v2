import { Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import MessageToast from "@/components/MessageToast";
import type { Metadata, Viewport } from 'next';

const notoGeo = Noto_Sans_Georgian({
  subsets: ["georgian"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-brand",
});

// ✅ მანიფესტი აქ იწერება და ხელით ლინკი აღარ გჭირდება
export const metadata: Metadata = {
  title: "შეხვდი",
  description: "Dating app",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json", 
};

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
          <MessageToast /> 
          {children}
        </Providers>
      </body>
    </html>
  );
}