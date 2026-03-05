import { Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const notoGeo = Noto_Sans_Georgian({
  subsets: ["georgian"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-brand",
});

export const metadata = {
  title: "Shekhvdi",
  description: "Dating app",
  icons: { icon: "/logo1.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoGeo.variable}>
      <body className="min-h-screen bg-black text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}