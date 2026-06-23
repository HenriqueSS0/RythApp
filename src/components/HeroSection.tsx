import { Button } from "@/components/ui/Button"
import Link from "next/link"
import Image from "next/image"
import { Play, ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden w-full">
      <div className="container mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left space-y-8 relative z-10">
          <div className="inline-flex items-center rounded-full border border-panel-border bg-[#0c0c0c] px-3 py-1 text-xs font-medium text-gray-300 mb-2">
            <span className="text-[#3b82f6] mr-2">IA Mapper v2.0 Live</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Gere mapas <br />
            para Rhythia
          </h1>
          <p className="text-lg text-[#a1a1aa] max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Envie uma música, escolha a dificuldade e visualize um mapa pronto para exportar. Tudo gerado automaticamente e otimizado para o flow perfeito.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <Link href="/generator">
              <Button size="lg" className="w-full sm:w-auto text-base gap-2 bg-[#2c3e50] hover:bg-[#34495e] border-none rounded-lg text-white">
                Começar agora <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="#preview">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base gap-2 rounded-lg border-[#333] hover:bg-[#111] text-white">
                <Play fill="currentColor" size={14} className="text-gray-400" /> Ver demonstração
              </Button>
            </Link>
          </div>

          <div className="flex gap-8 pt-8 border-t border-[#1a1a1a] mt-8 justify-center lg:justify-start">
            <div className="flex flex-col gap-1 text-left">
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><span className="text-[#3b82f6]">⚙</span> IA avançada</span>
              <span className="text-[10px] text-gray-500">Análise precisa de ritmo</span>
            </div>
            <div className="flex flex-col gap-1 text-left">
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><span className="text-gray-400">⏱</span> Rápido</span>
              <span className="text-[10px] text-gray-500">Mapas prontos em segundos</span>
            </div>
            <div className="flex flex-col gap-1 text-left">
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><span className="text-[#3b82f6]">✓</span> Pronto para exportar</span>
              <span className="text-[10px] text-gray-500">JSON 100% compatível</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full lg:w-auto relative z-0 flex justify-end lg:block">
          <div className="relative w-full lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 flex justify-end lg:w-[50vw]">
            <Image
              src="/hero.png"
              alt="Rhythia AutoMapper"
              width={1000}
              height={700}
              className="w-[120%] lg:w-[140%] max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] h-auto object-contain object-right drop-shadow-2xl translate-x-16"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
