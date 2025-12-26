import "./globals.css";
import { Noto_Sans_Georgian } from "next/font/google";

const notoGeo = Noto_Sans_Georgian({
  subsets: ["georgian"],
  weight: ["400", "600", "700"],
  variable: "--font-brand",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={notoGeo.variable}>
      <body>{children}</body>
    </html>
  );
}
