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
      <body className="h-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
