import { Copy } from "lucide-react"
import { GeneratedMap } from "@/lib/generator"

interface JsonPreviewProps {
  mapData: GeneratedMap | null;
}

export function JsonPreview({ mapData }: JsonPreviewProps) {
  // If we have mapData, format it. Otherwise show a placeholder.
  let jsonString = "";
  if (mapData) {
    // Show only the first 10 notes to avoid freezing the browser with a massive DOM block
    type PreviewData = Omit<GeneratedMap, 'Notes'> & { Notes: GeneratedMap['Notes']; _note?: string };
    const previewData: PreviewData = { ...mapData };
    if (previewData.Notes.length > 10) {
      previewData.Notes = previewData.Notes.slice(0, 10);
      previewData._note = `... and ${mapData.Notes.length - 10} more notes`;
    }
    jsonString = JSON.stringify(previewData, null, 2);
  } else {
    jsonString = `{
  "message": "Nenhum mapa gerado ainda.",
  "action": "Clique em 'Gerar Mapa' para ver o resultado"
}`;
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-full">
      <div className="bg-[#050505] px-4 py-3 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          <span className="ml-2 text-[10px] font-mono text-gray-500">{mapData ? `${mapData.LegacyId}.json` : 'preview.json'}</span>
        </div>
        <button 
          className="text-gray-500 hover:text-white transition-colors disabled:opacity-50" 
          title="Copiar JSON"
          disabled={!mapData}
          onClick={() => {
            if (mapData) {
               navigator.clipboard.writeText(JSON.stringify(mapData, null, 2));
            }
          }}
        >
          <Copy size={12} />
        </button>
      </div>
      <div className="p-4 bg-[#0a0a0a] overflow-auto flex-1 relative max-h-[500px]">
        <pre className="text-[10px] font-mono leading-relaxed text-gray-400">
          <code dangerouslySetInnerHTML={{
            __html: jsonString
              .replace(/"([^"]+)":/g, '<span class="text-gray-300">"$1"</span>:')
              .replace(/: ([0-9.]+)/g, ': <span class="text-[#3b82f6]">$1</span>')
              .replace(/: "([^"]+)"/g, ': <span class="text-[#eab308]">"$1"</span>')
              .replace(/"(.*?)"/g, '<span class="text-[#27c93f]">"$1"</span>')
          }} />
        </pre>
      </div>
    </div>
  )
}
