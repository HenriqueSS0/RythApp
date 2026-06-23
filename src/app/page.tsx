"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  const handleEnter = () => {
    setEntering(true)
    setTimeout(() => router.push("/generator"), 600)
  }

  return (
    <div
      className={`fixed inset-0 bg-[#0a0a0c] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        entering ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle Topography / Wave background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center overflow-hidden">
        {/* Abstract sine waves simulating the background from the brandkit */}
        <svg viewBox="0 0 1000 400" className="w-full min-w-[1200px] h-full object-cover text-[#3f3f46]">
          <path d="M0,200 Q150,50 300,200 T600,200 T900,200 T1200,200" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0,220 Q150,100 300,220 T600,220 T900,220 T1200,220" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-50" />
          <path d="M0,180 Q150,20 300,180 T600,180 T900,180 T1200,180" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30" />
          <path d="M0,250 Q180,10 350,250 T700,250 T1050,250 T1400,250" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
        </svg>
      </div>

      {/* Main content */}
      <div
        className={`relative flex flex-col items-center text-center gap-6 transition-all duration-700 ${
          ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo / Wordmark */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            {/* The brandkit star */}
            <div className="text-blue-600 mb-2 brand-glow rounded-full p-1 bg-blue-600/10">
              <Sparkles size={36} strokeWidth={1.5} className="fill-blue-600" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-white mb-2">
              Rythmap
            </h1>
            
            <p className="text-lg text-gray-400 font-light tracking-wide max-w-md mx-auto">
              Generate Rhythia Maps from Music.
            </p>
          </div>
        </div>

        {/* Enter Button */}
        <button
          onClick={handleEnter}
          className="mt-6 px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          {entering ? "Entering..." : "Enter App"}
        </button>
      </div>

      {/* Subtle Corner Info (Brandkit style) */}
      <div className="absolute bottom-8 left-8 text-xs text-gray-600 font-light max-w-[150px] leading-relaxed hidden md:block">
        Crafted for creators.
        <br />Built for explorers.
      </div>
      
      <div className="absolute bottom-8 w-full text-center text-xs text-gray-600 font-light hidden md:block">
        Made by: <a href="https://github.com/HenriqueSS0" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline transition-colors pointer-events-auto">Sartt</a>
      </div>
    </div>
  )
}

