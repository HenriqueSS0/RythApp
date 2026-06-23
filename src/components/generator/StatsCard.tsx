import { Clock, Activity, Hash } from "lucide-react"
import { GeneratedMap } from "@/lib/generator"

interface StatsCardProps {
  mapData: GeneratedMap | null;
  estimatedBpm?: number;
}

export function StatsCard({ mapData, estimatedBpm }: StatsCardProps) {
  
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const durationText = mapData ? formatDuration(mapData.Duration) : "00:00"
  const bpmValue = estimatedBpm ? Math.round(estimatedBpm).toString() : "---"
  const notesCount = mapData ? mapData.Notes.length.toString() : "0"
  const npsValue = mapData ? (mapData.Notes.length / (mapData.Duration / 1000)).toFixed(1) : "0.0";

  const stats = [
    { label: "Duration", value: durationText, icon: Clock, color: "text-blue-500" },
    { label: "Est. BPM", value: bpmValue, icon: Activity, color: "text-emerald-500" },
    { label: "Total Notes", value: notesCount, icon: Hash, color: "text-blue-400" },
    { label: "Notes / Sec (NPS)", value: npsValue, icon: Activity, color: "text-blue-300" },
  ]

  return (
    <div className="bg-[#0a0a0c] border border-[#27272a] rounded-xl p-6 w-full flex-1 flex flex-col">
      
      <div className="space-y-4 flex-1">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs font-medium text-gray-400">{stat.label}</span>
            </div>
            <span className="text-sm font-medium text-white">{stat.value}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-5 border-t border-[#27272a]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Internal Difficulty (1-6)</span>
          <span className="text-xs font-medium text-[#eab308]">
            Level {mapData ? mapData.Difficulty : 1}
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#18181b] rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500" 
            style={{ width: `${((mapData ? mapData.Difficulty : 1) / 6) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
