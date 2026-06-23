import { Upload, Copy, Play } from "lucide-react"
import { DemoMapGrid } from "./DemoMapGrid"

export function DemoPreview() {
  const jsonCode = `{
  "meta": {
    "song": "Galactic Drive",
    "bpm": 174,
    "difficulty": "Hard",
    "version": "2.0"
  },
  "notes": [
    { "time": 0.23, "x": 2, "y": 0 },
    { "time": 0.55, "x": 0, "y": 1 },
    { "time": 0.55, "x": 1, "y": 1 },
    { "time": 1.02, "x": 1, "y": 2 }
  ]
}`

  return (
    <section id="preview" className="py-24 border-t border-[#111] bg-black">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-white mb-16">
          Demo do gerador
        </h2>

        <div className="max-w-6xl mx-auto glass-panel rounded-xl border border-panel-border overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Column 1: Upload */}
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-white mb-3">1. Upload da música</h4>
            <div className="flex-1 border border-dashed border-[#333] rounded-lg bg-[#050505] p-6 flex flex-col items-center justify-center text-center">
              <Upload className="text-gray-500 mb-4" strokeWidth={1.5} size={32} />
              <p className="text-xs text-gray-400 mb-6">Arraste e solte seu arquivo aqui<br/>ou clique para selecionar</p>
              <div className="text-[10px] text-gray-600 mt-auto">Formatos aceitos: MP3, WAV<br/>Tamanho máximo: 50MB</div>
            </div>
          </div>
          
          {/* Column 2: Configurações */}
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-white mb-3">2. Configurações</h4>
            <div className="flex-1 space-y-6">
              <div>
                <label className="text-[10px] text-gray-400 mb-1.5 block">Nome da música</label>
                <input type="text" defaultValue="Galactic Drive.mp3" className="w-full bg-[#050505] border border-[#222] rounded px-3 py-2 text-xs text-white" />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 mb-1.5 block">Dificuldade</label>
                <div className="grid grid-cols-3 gap-2">
                  <button className="py-2 px-1 text-[10px] rounded border border-[#222] bg-[#050505] text-gray-400">Easy</button>
                  <button className="py-2 px-1 text-[10px] rounded border border-[#222] bg-[#050505] text-gray-400">Medium</button>
                  <button className="py-2 px-1 text-[10px] rounded border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]">Hard</button>
                </div>
              </div>

              <div className="border border-[#222] bg-[#050505] rounded p-3 flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">BPM detectado</div>
                  <div className="text-lg font-bold text-white">174</div>
                </div>
                <div className="text-[10px] text-gray-600">BPM</div>
              </div>
            </div>
          </div>
          
          {/* Column 3: Preview do mapa */}
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-white mb-3">3. Preview do mapa (3x3)</h4>
            <div className="flex-1 border border-[#222] rounded-lg bg-[#050505] p-4 flex flex-col justify-between items-center">
               <DemoMapGrid size="md" />
               <div className="w-full flex items-center gap-3 mt-6">
                 <Play className="text-gray-400" size={16} />
                 <div className="text-[10px] text-gray-500 font-mono">0:23 / 1:48</div>
                 <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-[#3b82f6]"></div>
                 </div>
               </div>
            </div>
          </div>
          
          {/* Column 4: JSON */}
          <div className="flex flex-col">
            <h4 className="text-xs font-bold text-white mb-3">4. JSON de exportação</h4>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-[#050505] border border-[#222] rounded-t-lg p-4 overflow-hidden relative">
                <pre className="text-[10px] font-mono leading-relaxed">
                  <code dangerouslySetInnerHTML={{
                    __html: jsonCode
                      .replace(/"([^"]+)":/g, '<span class="text-gray-300">"$1"</span>:')
                      .replace(/: ([0-9.]+)/g, ': <span class="text-[#3b82f6]">$1</span>')
                      .replace(/: "([^"]+)"/g, ': <span class="text-[#eab308]">"$1"</span>')
                  }} />
                </pre>
              </div>
              <button className="w-full py-2 bg-[#111] hover:bg-[#1a1a1a] border border-t-0 border-[#222] rounded-b-lg text-xs text-gray-300 flex items-center justify-center gap-2 transition-colors">
                <Copy size={12} /> Copiar JSON
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  )
}
