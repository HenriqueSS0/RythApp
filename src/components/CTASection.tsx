import { Button } from "@/components/ui/Button"
import { Users, Zap, Eye, Download, ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 border-t border-[#111] bg-[#050505]">
      <div className="container mx-auto px-6">
        
        {/* Footer Features Inline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-24 border-b border-[#111] pb-24">
          <div className="flex gap-4">
            <Users className="text-gray-400 mt-1" size={20} />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Feito para mappers</h4>
              <p className="text-xs text-[#a1a1aa]">Ferramentas criadas por quem entende de mapeamento.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Zap className="text-gray-400 mt-1" size={20} />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Rápido</h4>
              <p className="text-xs text-[#a1a1aa]">Da música ao mapa em questão de segundos.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Eye className="text-gray-400 mt-1" size={20} />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Visual limpo</h4>
              <p className="text-xs text-[#a1a1aa]">Interface minimalista para você focar no que importa.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Download className="text-gray-400 mt-1" size={20} />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Pronto para exportar</h4>
              <p className="text-xs text-[#a1a1aa]">Compatível com o Rhythia e pronto para jogar.</p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="glass-panel border border-[#222] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-6 mb-6 md:mb-0">
            <div className="w-12 h-12 rounded-full border border-[#333] bg-[#0a0a0a] flex items-center justify-center text-[#3b82f6]">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                Pronto para criar seu primeiro mapa?
              </h2>
              <p className="text-sm text-[#a1a1aa]">
                Comece agora e transforme suas músicas em desafios incríveis.
              </p>
            </div>
          </div>
          <Button className="bg-[#2c3e50] hover:bg-[#34495e] border-none text-white gap-2 px-6">
            Abrir gerador <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  )
}
