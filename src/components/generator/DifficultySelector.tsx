"use client"

interface DifficultySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  
  const getDifficultyLabel = (stars: number) => {
    if (stars <= 2.5) return { label: "Fácil", color: "text-[#27c93f]" };
    if (stars <= 4.5) return { label: "Médio", color: "text-[#ffbd2e]" };
    if (stars <= 6.5) return { label: "Difícil", color: "text-[#ff5f56]" };
    if (stars <= 8.5) return { label: "Expert", color: "text-[#d946ef]" };
    if (stars <= 11.0) return { label: "Insano", color: "text-[#8b5cf6]" };
    return { label: "Extremo", color: "text-[#ef4444]" };
  };

  const { label, color } = getDifficultyLabel(value);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center space-y-6 bg-[#0a0a0c] border border-[#27272a] rounded-xl p-6">
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-400">Star Rating</label>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-500">
              {value.toFixed(1)} <span className="text-[#eab308]">★</span>
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>
              {label}
            </div>
          </div>
        </div>
        
        <input 
          type="range" 
          min="1" 
          max="15" 
          step="0.1" 
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-blue-600"
        />
        
        <div className="flex justify-between text-xs text-gray-500 font-mono">
          <span>1.0</span>
          <span>15.0</span>
        </div>
        
      </div>
    </div>
  )
}
