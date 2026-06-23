"use client"
import { useState, useCallback } from "react"
import { UploadCard } from "@/components/generator/UploadCard"
import { DifficultySelector } from "@/components/generator/DifficultySelector"
import { PatternStyleSelector, ALL_PATTERN_IDS } from "@/components/generator/PatternStyleSelector"
import { StatsCard } from "@/components/generator/StatsCard"
import { TutorialModal } from "@/components/ui/TutorialModal"
import { Download, Wand2, Settings, FolderHeart, Sparkles, BrainCircuit, ShieldAlert, Info, RefreshCw, CheckCircle, AlertCircle, X } from "lucide-react"
import { generateMap, GeneratedMap, createAIMapPlan } from "@/lib/generator"
import { AudioAnalysisResult } from "@/lib/audioAnalyzer"
import { writeSSPM } from "@/lib/sspmWriter"
import { saveAs } from "file-saver"
import { invoke } from "@tauri-apps/api/core"

interface SavedMapMeta {
  id: string
  name: string
  mapper: string
  stars: number
  noteCount: number
  timestamp: number
  legacyId: string
}

interface Toast {
  id: string
  type: "success" | "error" | "info"
  title: string
  message: string
}

export default function GeneratorPage() {
  const [currentTab, setCurrentTab] = useState<"generator" | "my-maps" | "settings">("generator")
  
  // Generator states
  const [songName, setSongName] = useState("Galactic Drive")
  const [mapperName, setMapperName] = useState("AutoMapper AI")
  const [coverData, setCoverData] = useState<ArrayBuffer | null>(null)
  const [stars, setStars] = useState(4.5)
  const [audioData, setAudioData] = useState<AudioAnalysisResult | null>(null)
  const [allowedPatterns, setAllowedPatterns] = useState<string[]>(ALL_PATTERN_IDS)
  
  const [useAi, setUseAi] = useState(false)
  const [aiStatus, setAiStatus] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMap, setGeneratedMap] = useState<GeneratedMap | null>(null)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  
  // App Config states - lazy init from localStorage to avoid setState-in-effect
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === 'undefined') return "";
    return localStorage.getItem("openrouter_api_key") || "";
  })
  const [rhythiaPath, setRhythiaPath] = useState(() => {
    if (typeof window === 'undefined') return "";
    return localStorage.getItem("rhythia_game_path") || "";
  })
  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  // My Maps State
  const [savedMaps, setSavedMaps] = useState<SavedMapMeta[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem("rhythia_generator_history") || "[]");
    } catch { return []; }
  })
  const [sessionBlobs, setSessionBlobs] = useState<Record<string, Blob>>({});

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: Toast["type"], title: string, message: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // Auto-detect game path on desktop if not already saved
  useState(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem("rhythia_game_path") && '__TAURI_INTERNALS__' in window) {
      invoke<string>("get_rhythia_path")
        .then(p => { setRhythiaPath(p); localStorage.setItem("rhythia_game_path", p); })
        .catch(err => console.error("Falha ao obter caminho do Rhythia", err));
    }
  });

  const handleApiKeyChange = (val: string) => {
    setApiKey(val)
    localStorage.setItem("openrouter_api_key", val)
  }

  const handleRhythiaPathChange = (val: string) => {
    setRhythiaPath(val)
    localStorage.setItem("rhythia_game_path", val)
  }

  const handleAutoDetectPath = async () => {
    try {
      const detected = await invoke<string>("get_rhythia_path")
      handleRhythiaPathChange(detected)
      showToast("success", "Caminho detectado", detected)
    } catch {
      showToast("error", "Falha na detecção", "Não foi possível encontrar a pasta do Rhythia automaticamente.")
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    let resolvedPlan = null;
    
    if (useAi && audioData) {
      setAiStatus("Analisando áudio e enviando comandos de IA...");
      const aiResult = await createAIMapPlan(audioData, stars, songName, allowedPatterns, apiKey);
      if (aiResult) {
        setAiStatus("A IA desenhou a coreografia! Gerando blocos...");
        resolvedPlan = aiResult;
      } else {
        setAiStatus("Erro na IA. Gerando por algoritmo procedural.");
      }
    } else {
      setAiStatus("");
    }
    
    if (!useAi) await new Promise(r => setTimeout(r, 200));

    const newMap = generateMap(songName, mapperName, stars, audioData || undefined, resolvedPlan || undefined, allowedPatterns);
    setGeneratedMap(newMap);
    
    // Auto-save generated map to My Maps session list
    const newMeta: SavedMapMeta = {
      id: Math.random().toString(36).substring(7),
      name: songName,
      mapper: mapperName,
      stars: stars,
      noteCount: newMap.Notes.length,
      timestamp: Date.now(),
      legacyId: newMap.LegacyId
    };

    // Build the Blob
    const sspmBlob = await writeSSPM(
      newMap, 
      audioData ? audioData.originalBuffer : null, 
      coverData
    );

    // Save Blob in session memory
    setSessionBlobs(prev => ({ ...prev, [newMeta.id]: sspmBlob, latest: sspmBlob }));

    // Save Meta in list
    const updatedList = [newMeta, ...savedMaps];
    setSavedMaps(updatedList);
    localStorage.setItem("rhythia_generator_history", JSON.stringify(updatedList));

    if (useAi && resolvedPlan) setAiStatus("Mapa gerado com sucesso!");
    setIsGenerating(false);
  }

  const handleInjectOrDownload = async (metaId: string, name: string, legacyId: string, sessionBlob?: Blob) => {
    const blob = sessionBlob;
    if (!blob) {
      showToast("error", "Arquivo indisponível", "Gere o mapa novamente para baixá-lo nesta sessão.");
      return;
    }

    if (isDesktop) {
      try {
        const path = rhythiaPath || await invoke<string>("get_rhythia_path");
        const filename = `${legacyId}.sspm`;
        const buffer = await blob.arrayBuffer();
        const dataArray = Array.from(new Uint8Array(buffer));
        
        await invoke("inject_map", { 
          path, 
          filename, 
          data: dataArray 
        });
        
        showToast("success", `"${name}" injetado!`, "O mapa foi enviado para a pasta do jogo com sucesso.");
      } catch (e) {
        console.error("Tauri injection failed", e);
        showToast("error", "Falha na injeção", "Não foi possível enviar para o jogo. Baixando o arquivo...");
        saveAs(blob, `${legacyId}.sspm`);
      }
    } else {
      saveAs(blob, `${legacyId}.sspm`);
      showToast("info", "Download iniciado", `Arquivo ${legacyId}.sspm salvo na pasta de downloads.`);
    }
  }

  const handleDeleteSavedMap = (id: string) => {
    const updated = savedMaps.filter(m => m.id !== id);
    setSavedMaps(updated);
    localStorage.setItem("rhythia_generator_history", JSON.stringify(updated));
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden text-gray-300 font-sans text-sm select-none" style={{ background: "#09090b" }}>
      
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-4 px-5 py-4 min-w-[300px] max-w-sm rounded-2xl border animate-in slide-in-from-right-5 fade-in duration-300"
            style={{
              background: "rgba(10, 10, 12, 0.95)",
              backdropFilter: "blur(10px)",
              borderColor: toast.type === "success" ? "rgba(59, 130, 246, 0.4)" : toast.type === "error" ? "rgba(244, 63, 94, 0.3)" : "rgba(59, 130, 246, 0.2)",
              boxShadow: toast.type === "success" ? "0 0 40px rgba(59, 130, 246, 0.15)" : toast.type === "error" ? "0 0 30px rgba(244, 63, 94, 0.1)" : "0 0 30px rgba(59, 130, 246, 0.1)"
            }}
          >
            {toast.type === "success" && <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />}
            {toast.type === "error" && <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: "#f43f5e" }} />}
            {toast.type === "info" && <Info size={14} className="shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />}
            <div className="flex-1">
              <p className="font-medium text-white text-sm">{toast.title}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-gray-500 hover:text-white transition-colors ml-2 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Side Navigation Bar */}
      <aside className="w-64 border-r flex flex-col justify-between shrink-0 relative z-10" style={{ borderColor: "#27272a", background: "#0a0a0c" }}>
        <div>
          {/* Brand/Header */}
          <div className="p-6 pb-4 flex items-center gap-3">
            <div className="text-blue-600 rounded-full bg-blue-600/10 p-1">
              <Sparkles size={18} strokeWidth={2} className="fill-blue-600" />
            </div>
            <span className="font-medium text-white tracking-wide text-lg">Rythmap</span>
            {isDesktop && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: "#a1a1aa", background: "#27272a" }}>App</span>}
          </div>

          {/* Nav Items */}
          <nav className="px-4 py-2 space-y-1.5">
            <button
              onClick={() => setCurrentTab("generator")}
              className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 rounded-xl ${
                currentTab === "generator"
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Wand2 size={16} />
              <span>Generator</span>
            </button>

            <button
              onClick={() => setCurrentTab("my-maps")}
              className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 rounded-xl ${
                currentTab === "my-maps"
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <FolderHeart size={16} />
              <span>My Maps</span>
            </button>

            <button
              onClick={() => setCurrentTab("settings")}
              className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 rounded-xl ${
                currentTab === "settings"
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-6 text-xs text-gray-500 space-y-2">
          <div className="flex items-center gap-3 border-t pt-4" style={{ borderColor: "#27272a" }}>
            <div className="w-8 h-8 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: isDesktop ? "#10b981" : "#f59e0b" }} />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Rhythia Game</p>
              <p className="text-gray-500 text-xs">{isDesktop ? "Ready to inject" : "Web Mode"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10" style={{ background: "#0f0f11" }}>
        
        {/* Top Header */}
        <header className="h-20 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-medium text-xl capitalize">{currentTab.replace("-", " ")}</h2>
            {isDesktop && <span className="text-gray-500 text-xs ml-4 max-w-sm truncate border-l pl-4 border-[#27272a]">Folder: {rhythiaPath || "Not detected"}</span>}
          </div>
          <div className="flex items-center gap-3">
            {isGenerating && (
              <span className="flex items-center gap-2 text-blue-500 font-medium text-xs">
                <Sparkles size={14} className="animate-pulse" />
                Processing Map...
              </span>
            )}
          </div>
        </header>

        {/* Dynamic Tab Views */}
        <div className="flex-1 overflow-y-auto min-h-0 px-8 pb-8">
          
          {/* TAB 1: GENERATOR */}
          {currentTab === "generator" && (
            <div className="space-y-6">
              
              <div className="mb-4">
                <p className="text-gray-400 text-sm">Create unique Rhythia maps from your favorite music.</p>
              </div>

              {/* Generator Core Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* 1. Upload */}
                <div className="glass-panel p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-white font-medium">
                    <span className="text-gray-400 text-xs mr-1">1</span> Upload Music
                  </div>
                  <div className="flex-1">
                    <UploadCard
                      onAnalyzeStart={() => { }}
                      onAnalyzeSuccess={(res) => {
                        setAudioData(res);
                        const nameWithoutExt = res.originalFileName.replace(/\.[^/.]+$/, "");
                        setSongName(nameWithoutExt);
                      }}
                      onAnalyzeError={(err) => alert(err)}
                      onClear={() => { setAudioData(null); }}
                    />
                  </div>
                </div>

                {/* 2. Metadata & Style Settings */}
                <div className="glass-panel p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-2 text-white font-medium">
                    <span className="text-gray-400 text-xs mr-1">2</span> Map Details
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5 font-medium">Map Name</label>
                      <input 
                        type="text" 
                        value={songName} 
                        onChange={(e) => setSongName(e.target.value)} 
                        className="w-full px-3 py-2 text-sm text-white focus:outline-none rounded-lg" 
                        style={{ background: "#0a0a0c", border: "1px solid #27272a" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Author</label>
                          <input 
                            type="text" 
                            value={mapperName} 
                            onChange={(e) => setMapperName(e.target.value)} 
                            className="w-full px-3 h-10 text-sm text-white focus:outline-none rounded-lg" 
                            style={{ background: "#0a0a0c", border: "1px solid #27272a" }}
                          />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Cover Image</label>
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => setCoverData(e.target?.result as ArrayBuffer);
                              reader.readAsArrayBuffer(file);
                            } else {
                              setCoverData(null);
                            }
                          }} 
                          className="block w-full h-10 text-xs text-gray-400 cursor-pointer rounded-lg border border-[#27272a] bg-[#0a0a0c] overflow-hidden file:h-full file:cursor-pointer file:border-0 file:bg-[#27272a] file:px-4 file:text-white hover:file:bg-[#3f3f46] file:text-xs file:font-medium file:mr-3 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                         <div className="flex items-center gap-2 text-white font-medium">
                          <span className="text-gray-400 text-xs mr-1">3</span> AI Generation
                        </div>
                        {/* Custom Toggle */}
                        <div 
                          className="w-9 h-5 rounded-full relative cursor-pointer transition-colors"
                          style={{ background: useAi ? "#2563eb" : "#27272a" }}
                          onClick={() => setUseAi(!useAi)}
                        >
                          <div 
                            className="absolute top-0.5 bottom-0.5 bg-white rounded-full transition-transform aspect-square"
                            style={{ transform: useAi ? "translateX(16px)" : "translateX(2px)" }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-blue-500/80 mb-3 font-medium">
                        Recomendamos fortemente manter ativado para resultados coerentes.
                      </p>
                      
                      {useAi && (
                        <div className="p-3 rounded-lg border flex flex-col gap-2 mt-2" style={{ background: "#0a0a0c", borderColor: "#27272a" }}>
                          <p className="text-xs text-gray-400">Uses OpenRouter LLM to dynamically choreograph patterns.</p>
                          {!apiKey && (
                            <div className="text-rose-400 text-xs flex items-center gap-1.5 mt-1">
                              <ShieldAlert size={12} />
                              <span>API Key missing in Settings</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Difficulty */}
                <div className="glass-panel p-6 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4 text-white font-medium">
                    <span className="text-gray-400 text-xs mr-1">4</span> Note Style
                  </div>
                  <div className="mb-4">
                    <PatternStyleSelector selected={allowedPatterns} onChange={setAllowedPatterns} />
                  </div>
                  <DifficultySelector value={stars} onChange={setStars} />
                </div>

                {/* 4. Generation Actions */}
                <div className="glass-panel p-6 flex flex-col justify-end">
                  <div className="flex-1">
                    <StatsCard mapData={generatedMap} estimatedBpm={audioData?.estimatedBpm} />
                  </div>
                  
                  {/* Action Trigger Buttons */}
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !audioData}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-[#27272a] disabled:text-gray-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full" />
                          <span>PROCESSANDO...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={13} />
                          <span>GERAR MAPA</span>
                        </>
                      )}
                    </button>
                    
                    {generatedMap && (
                      <button
                        onClick={() => handleInjectOrDownload("latest", generatedMap.SongName, generatedMap.LegacyId, sessionBlobs["latest"])}
                        className="w-full h-11 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        <span>{isDesktop ? "Inject Map" : "Download Map"}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Console logs / AI Status updates */}
              {aiStatus && (
                <div className="glass-panel p-4 text-xs font-mono flex items-center gap-3 text-blue-400">
                  <Sparkles size={14} className="animate-pulse shrink-0" />
                  <span>&gt; {aiStatus}</span>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MY MAPS */}
          {currentTab === "my-maps" && (
            <div className="space-y-6">
              <div className="mb-4">
                <p className="text-gray-400 text-sm">Your generated maps library. View or reinstall maps generated during this session.</p>
              </div>

              {savedMaps.length === 0 ? (
                <div className="glass-panel p-12 text-center flex flex-col items-center justify-center border-dashed">
                  <FolderHeart size={32} className="text-[#3f3f46] mb-3" />
                  <p className="text-gray-500 font-medium">No maps generated yet.</p>
                </div>
              ) : (
                <div className="glass-panel overflow-hidden">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-[#27272a] bg-[#18181b] text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div>Map Name</div>
                    <div>Mapper</div>
                    <div>Difficulty</div>
                    <div>Blocks</div>
                    <div className="text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-[#27272a]">
                    {savedMaps.map((map) => (
                      <div key={map.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-4 items-center transition-colors hover:bg-[#1f1f24]">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-white">{map.name}</span>
                          <span className="text-xs text-gray-500">{new Date(map.timestamp).toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="text-sm text-gray-400">{map.mapper}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-2 py-1 rounded-md bg-[#27272a] text-gray-300 font-medium">⭐ {map.stars}</span>
                        </div>
                        <div className="text-sm text-gray-400">{map.noteCount}</div>
                        
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={() => handleInjectOrDownload(map.id, map.name, map.legacyId, sessionBlobs[map.id])}
                            className="px-4 py-2 font-medium transition-all text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isDesktop ? "Inject" : "Download"}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedMap(map.id)}
                            className="p-2 text-gray-500 transition-colors hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {currentTab === "settings" && (
            <div className="max-w-2xl space-y-6">
              <div className="mb-4">
                <p className="text-gray-400 text-sm">Advanced configuration and preferences.</p>
              </div>

              {/* OpenRouter Box */}
              <div className="glass-panel p-6 space-y-5">
                <div className="flex items-center gap-2 font-medium text-white border-b border-[#27272a] pb-4">
                  <BrainCircuit size={18} className="text-blue-500" />
                  <span>API Configuration</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 block font-medium">OpenRouter API Key</label>
                    <button onClick={() => setIsTutorialOpen(true)} className="text-[10px] text-blue-500 hover:text-blue-400 font-medium transition-colors">
                      Como pegar a Key?
                    </button>
                  </div>
                  <input 
                    type="password" 
                    value={apiKey} 
                    onChange={(e) => handleApiKeyChange(e.target.value)} 
                    placeholder="sk-or-v1-..." 
                    className="w-full px-4 py-2.5 text-white font-mono focus:outline-none rounded-lg text-sm" 
                    style={{ background: "#0a0a0c", border: "1px solid #27272a" }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Key is securely stored locally. Required for AI Generation.
                  </p>
                  
                  <div className="mt-4 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex gap-3 text-xs text-blue-200/80 leading-relaxed">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p>
                      O Rythmap utiliza exclusivamente modelos gratuitos, portanto não há previsão de consumo pago da sua API. Ainda assim, por segurança, recomendamos definir um limite de gastos de US$ 0,01 na sua conta para garantir que nenhuma cobrança acidental ocorra.
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Path Box */}
              <div className="glass-panel p-6 space-y-5">
                <div className="flex items-center gap-2 font-medium text-white border-b border-[#27272a] pb-4">
                  <Settings size={18} className="text-blue-500" />
                  <span>Game Configuration</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block font-medium">Maps Folder Path</label>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      value={rhythiaPath} 
                      onChange={(e) => handleRhythiaPathChange(e.target.value)}
                      placeholder="C:\Users\...\Rhythia\maps"
                      className="flex-1 px-4 py-2.5 text-gray-300 font-mono focus:outline-none text-sm rounded-lg" 
                      style={{ background: "#0a0a0c", border: "1px solid #27272a" }}
                    />
                    {isDesktop && (
                      <button
                        onClick={handleAutoDetectPath}
                        className="px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] text-white"
                        title="Auto-detect Rhythia folder"
                      >
                        <RefreshCw size={14} />
                        <span>Detect</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Paste the full path or click Detect to find it automatically.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  )
}
