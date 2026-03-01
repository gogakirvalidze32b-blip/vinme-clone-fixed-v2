import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Noto_Sans_Georgian } from "next/font/google";

const notoGeo = Noto_Sans_Georgian({
  subsets: ["georgian"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "Shekhvdi",
  description: "Dating app",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoGeo.variable}>
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
