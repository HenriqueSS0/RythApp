import { CloudUpload, SlidersHorizontal, Download } from "lucide-react"
import Image from "next/image"

export function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "Envie sua música",
      description: "Arraste e solte seu arquivo de áudio. Suportamos MP3, OGG, WAV e FLAC.",
      icon: CloudUpload,
    },
    {
      step: "2",
      title: "Escolha a dificuldade",
      description: "Selecione o nível de dificuldade e ajuste as preferências para combinar com seu estilo.",
      icon: SlidersHorizontal,
    },
    {
      step: "3",
      title: "Exporte seu mapa",
      description: "Gere e exporte seu mapa em JSON, pronto para ser usado no seu jogo favorito.",
      icon: Download,
    }
  ]

  return (
    <section id="how-it-works" className="py-32 border-t border-[#111] bg-black relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        
        {/* Header and Floating Image */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 relative">
          <div className="max-w-xl">
            <span className="text-[#3b82f6] text-xs font-bold tracking-widest uppercase mb-4 block">Como Funciona</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Três passos simples para <br className="hidden md:block"/>
              criar seu mapa
            </h2>
          </div>
          
          <div className="hidden md:block absolute -right-10 top-1/2 -translate-y-1/2 w-[500px] pointer-events-none opacity-80 mix-blend-screen">
            <Image src="/image.png" alt="Star Orbit" width={500} height={500} className="w-full h-auto object-contain object-right" />
          </div>
        </div>
        
        <div className="relative mt-12">
          {/* Connecting dashed line */}
          <div className="hidden md:block absolute top-0 left-[16%] right-[16%] h-[1px] border-t-2 border-dotted border-[#3b82f6]/40 z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="relative mt-6 md:mt-0">
                {/* Number Circle sitting on top border */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-white font-bold text-[15px] z-20 shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                  {step.step}
                  <div className="absolute inset-0 rounded-full border border-[#3b82f6]/20 mix-blend-overlay"></div>
                </div>
                
                <div className="h-full bg-[#050505] p-8 pt-10 rounded-2xl border border-[#1a1a1a] flex flex-col sm:flex-row gap-5 items-start transition-all duration-300 hover:bg-[#0a0a0a] hover:border-[#333] group">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-[#222] flex items-center justify-center shrink-0 group-hover:border-[#444] transition-colors shadow-inner">
                    <step.icon size={22} className="text-[#d4d4d8] group-hover:text-white transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-[13px] text-[#888] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
