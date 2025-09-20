"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  MessageCircleIcon,
  BrainIcon,
  SearchIcon,
  CircleUserIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white min-h-screen flex flex-col items-center justify-center`}
        style={{ margin: 0, paddingBottom: "64px" }}
      >
        <main className={pathname === "/profile" ? "w-full" : "max-w-md mx-auto"}>{children}</main>
        {/* Mobile Tab Bar - hidden on home page */}
        {!isHome && (
          <nav
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-between items-center bg-gray-100 border-t border-gray-300 h-16 px-4 z-50 shadow"
            style={{
              boxShadow: "0 -1px 8px rgba(0,0,0,0.05)"
            }}
          >
            <Tab icon={<MessageCircleIcon size={24} />} label="Chat" href="/avatar" />
            <Tab icon={<BrainIcon size={24} />} label="Memory" href="/memory" />
            <Tab icon={<SearchIcon size={24} />} label="Explore" href="/explore" />
            <Tab icon={<CircleUserIcon size={24} />} label="Profile" href="/profile" />
          </nav>
        )}
      </body>
    </html>
  );
}

// Simple Tab component
function Tab({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center text-xs text-gray-700 hover:text-blue-600 flex-1"
      style={{ textDecoration: "none" }}
    >
      <span>{icon}</span>
      {label}
    </a>
  );
}
