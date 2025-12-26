import "./globals.css";
import AppShell from "@/components/AppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-dvh">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
