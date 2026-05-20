import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growloc — Plant monitoring",
  description:
    "AI-powered plant monitoring: upload images and inspect canopy metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
