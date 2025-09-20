"use client"

import Image from "next/image";
import GradientBackground from "@/components/backgrounds/GradientBackground"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6">
      <GradientBackground />
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="Buddyku Logo"
          width={96}
          height={96}
          className="rounded-full shadow-lg"
        />
      </div>
      {/* App Name */}
      <h1 className="text-4xl font-bold text-black mb-2">Buddiku</h1>
      {/* Short Description */}
      <p className="text-center text-black text-base mb-8 max-w-xs">
        Your safe space for daily reflection, guided journaling, and compassionate AI support.
      </p>
      {/* Get Started Button */}
      <button
        className="bg-white text-blue-600 font-semibold rounded-full px-8 py-3 shadow-lg hover:bg-blue-50 transition"
        onClick={() => {
          window.location.href = '/avatar';
        }}
      >
        Get Started
      </button>
    </div>
  );
}