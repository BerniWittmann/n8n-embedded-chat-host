import type { Metadata } from "next";
import "./globals.css";
import "@n8n/chat/style.css";

export const metadata: Metadata = {
  title: "Chat",
  description: "Embedded chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f6f8] text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
