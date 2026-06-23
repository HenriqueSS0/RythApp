"use client"
import { useState, useRef } from "react"
import { Upload, FileAudio, X, Loader2 } from "lucide-react"
import { analyzeAudio, AudioAnalysisResult } from "@/lib/audioAnalyzer"

interface UploadCardProps {
  onAnalyzeStart: () => void;
  onAnalyzeSuccess: (result: AudioAnalysisResult) => void;
  onAnalyzeError: (err: string) => void;
  onClear: () => void;
}

export function UploadCard({ onAnalyzeStart, onAnalyzeSuccess, onAnalyzeError, onClear }: UploadCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileInfo, setFileInfo] = useState<{name: string, size: string, hash?: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileInfo({ name: file.name, size: formatSize(file.size) });
    setIsAnalyzing(true);
    onAnalyzeStart();

    try {
      const result = await analyzeAudio(file);
      setFileInfo(prev => prev ? { ...prev, hash: result.hash } : null);
      onAnalyzeSuccess(result);
    } catch (error: unknown) {
      console.error(error);
      onAnalyzeError((error as Error).message || "Erro ao analisar o áudio.");
      setFileInfo(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear();
  };

  return (
    <div className="flex flex-col h-full">
      {!fileInfo ? (
        <label className="flex-1 border border-dashed border-[#3f3f46] hover:border-blue-500 rounded-xl bg-[#0a0a0c] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
          <input 
            type="file" 
            accept="audio/*" 
            className="hidden" 
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <div className="w-12 h-12 rounded-full bg-[#18181b] flex items-center justify-center text-gray-500 group-hover:text-blue-500 group-hover:scale-110 transition-all mb-4">
            <Upload size={24} />
          </div>
          <p className="text-sm font-medium text-white mb-1">Click or drag audio file here</p>
          <p className="text-xs text-gray-500">MP3, OGG or WAV</p>
        </label>
      ) : (
        <div className="flex-1 border border-[#27272a] rounded-xl bg-[#0a0a0c] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="text-blue-500 bg-blue-500/10 p-2 rounded-lg">
                <FileAudio size={20} />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate" title={fileInfo.name}>{fileInfo.name}</p>
                <p className="text-xs text-gray-500">{fileInfo.size}</p>
              </div>
            </div>
            {!isAnalyzing && (
              <button onClick={handleClear} className="text-gray-500 hover:text-white p-1.5 hover:bg-[#27272a] rounded-md transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="mt-auto bg-[#18181b] rounded-lg p-3 border border-[#27272a]">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-blue-500">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-mono">Analyzing peaks & generating SHA-256...</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Hash (AudioFileName)</span>
                  <span className="text-xs text-emerald-500 font-mono">OK</span>
                </div>
                <p className="text-xs font-mono text-gray-400 truncate" title={fileInfo.hash}>
                  {fileInfo.hash}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
