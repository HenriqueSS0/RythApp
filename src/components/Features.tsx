import { Brain, Zap, CheckSquare, Code, Waypoints, SlidersHorizontal } from "lucide-react"

const features = [
  {
    title: "IA avançada",
    description: "Algoritmos inteligentes que analisam cada detalhe da música para gerar mapas precisos e dinâmicos.",
    icon: Brain
  },
  {
    title: "Mapeamento rápido",
    description: "Gere mapas completos em segundos, economizando horas de trabalho manual.",
    icon: Zap
  },
  {
    title: "Pronto para exportar",
    description: "Arquivos otimizados e compatíveis com as principais ferramentas da comunidade.",
    icon: CheckSquare
  },
  {
    title: "Compatível com JSON",
    description: "Exportação 100% compatível com o formato JSON utilizado pelos principais jogos de ritmo.",
    icon: Code
  },
  {
    title: "Fluxo otimizado",
    description: "Mapas com melhor fluxo, variedade e leitura para uma experiência de jogo fluida e divertida.",
    icon: Waypoints
  },
  {
    title: "Ajuste de dificuldade",
    description: "Controle o nível de desafio e personalize a intensidade do seu mapa conforme sua necessidade.",
    icon: SlidersHorizontal
  }
]

export function Features() {
  return (
    <section id="features" className="py-24 border-t border-[#111] relative overflow-hidden">
      {/* Imagem decorativa de fundo à direita, se desejar colocar depois. Por enquanto usamos divs para simular os blocos brilhantes */}
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mb-16">
          <span className="text-[#3b82f6] text-xs font-bold tracking-widest uppercase mb-4 block">Recursos</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
            Tudo que você precisa <br className="hidden md:block"/>
            para criar mapas incríveis
          </h2>
          <p className="text-[#a1a1aa] text-lg leading-relaxed">
            Tecnologia de ponta para transformar sua música <br className="hidden md:block"/>
            em experiências de jogo memoráveis.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-[#050505] p-6 rounded-2xl border border-[#1a1a1a] transition-all duration-300 hover:bg-[#0a0a0a] hover:border-[#333] group">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-[#222] flex items-center justify-center shrink-0 group-hover:border-[#444] transition-colors shadow-inner">
                  <feature.icon size={22} className="text-[#d4d4d8] group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-[13px] text-[#888] leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
