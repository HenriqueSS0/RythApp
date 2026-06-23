import { GeneratedMap } from "@/lib/generator"
import { AudioAnalysisResult } from "@/lib/audioAnalyzer"

interface TimelinePreviewProps {
  mapData: GeneratedMap | null;
  audioData?: AudioAnalysisResult | null;
}


export function TimelinePreview({ mapData, audioData }: TimelinePreviewProps) {
  const notes = mapData ? mapData.Notes : [];
  const duration = audioData ? audioData.durationMs : (mapData ? mapData.Duration : 30000);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Detect snake-like streaks in the notes: 6+ notes with <150ms gaps between them
  const snakeStreaks: {startMs: number, endMs: number}[] = [];
  if (notes.length > 5) {
    let streakStart = -1;
    let streakCount = 0;
    for (let i = 1; i < notes.length; i++) {
      const gap = notes[i].Time - notes[i - 1].Time;
      if (gap < 150) {
        if (streakStart < 0) { streakStart = notes[i - 1].Time; streakCount = 2; }
        else streakCount++;
      } else {
        if (streakStart >= 0 && streakCount >= 6) {
          snakeStreaks.push({ startMs: streakStart, endMs: notes[i - 1].Time });
        }
        streakStart = -1;
        streakCount = 0;
      }
    }
    if (streakStart >= 0 && streakCount >= 6) {
      snakeStreaks.push({ startMs: streakStart, endMs: notes[notes.length - 1].Time });
    }
  }

  // Count patterns: we use the streaks as snake, rest as other
  const snakeNoteCount = snakeStreaks.reduce((acc, s) => {
    return acc + notes.filter(n => n.Time >= s.startMs && n.Time <= s.endMs).length;
  }, 0);
  const otherNoteCount = notes.length - snakeNoteCount;

  return (
    <div className="mt-auto pt-6 border-t border-[#111]">
      <div className="flex justify-between items-end mb-3">
        <h4 className="text-[10px] font-bold text-white">Estrutura Musical & Notas</h4>
        <span className="text-[10px] text-[#3b82f6] font-mono">00:00 / {formatDuration(duration)}</span>
      </div>
      
      {/* Main Timeline Bar */}
      <div className="relative h-24 bg-[#050505] border border-[#222] rounded-lg overflow-hidden flex items-end mb-2">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px)] bg-[size:10%_100%]" />

        {!audioData && !mapData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-gray-500">Gere um mapa para visualizar</span>
          </div>
        )}

        {/* Section backgrounds */}
        {audioData?.sections?.map((sec, i) => {
          let bgColor = "transparent";
          if (sec.type === "drop") bgColor = "rgba(239, 68, 68, 0.15)";
          if (sec.type === "build") bgColor = "rgba(234, 179, 8, 0.1)";
          if (sec.type === "break" || sec.type === "intro" || sec.type === "outro") bgColor = "rgba(59, 130, 246, 0.1)";
          return (
            <div key={`sec-${i}`} className="absolute h-full bottom-0"
              style={{ left: `${(sec.startMs / duration) * 100}%`, width: `${((sec.endMs - sec.startMs) / duration) * 100}%`, backgroundColor: bgColor }}
              title={sec.type} />
          );
        })}

        {/* Sustained Event Highlights (green tint = snake zones) */}
        {audioData?.sustainedEvents?.map((evt, i) => (
          <div key={`sus-${i}`} className="absolute h-full bottom-0 border-l border-r border-green-500/30"
            style={{ left: `${(evt.startMs / duration) * 100}%`, width: `${((evt.endMs - evt.startMs) / duration) * 100}%`, backgroundColor: "rgba(34,197,94,0.10)" }}
            title={`${evt.type} (snake zone)`} />
        ))}

        {/* Silence blacked out */}
        {audioData?.silenceRanges?.map((silence, i) => (
          <div key={`silence-${i}`} className="absolute h-full bottom-0 bg-black/60"
            style={{ left: `${(silence.startMs / duration) * 100}%`, width: `${((silence.endMs - silence.startMs) / duration) * 100}%` }} />
        ))}

        {/* Energy waveform */}
        {audioData?.energyCurve?.map((point, i) => (
          <div key={`e-${i}`} className="absolute bottom-0 bg-white/12 w-px"
            style={{ left: `${(point.timeMs / duration) * 100}%`, height: `${point.energy * 100}%` }} />
        ))}

        {/* Snake streak highlights (bright green bars) */}
        {snakeStreaks.map((streak, i) => (
          <div key={`snake-${i}`} className="absolute bottom-0 border-l border-r border-green-400/60"
            style={{ left: `${(streak.startMs / duration) * 100}%`, width: `${Math.max(0.3, ((streak.endMs - streak.startMs) / duration) * 100)}%`, backgroundColor: "rgba(34,197,94,0.25)", height: "100%" }}
            title="Snake trail detected" />
        ))}

        {/* Note dots */}
        {notes.map((note, i) => {
          const inSnake = snakeStreaks.some(s => note.Time >= s.startMs && note.Time <= s.endMs);
          return (
            <div key={`n-${i}`} className="absolute w-0.5 rounded-sm"
              style={{ left: `${(note.Time / duration) * 100}%`, bottom: `${(note.Y / 2) * 60 + 5}%`, height: "8px", backgroundColor: inSnake ? "#22c55e" : (note.Y === 0 ? "#3b82f6" : note.Y === 1 ? "#eab308" : "#ef4444") }}
              title={`Note at ${note.Time}ms (${note.X},${note.Y})`} />
          );
        })}
      </div>

      {/* Pattern Usage Stats Bar */}
      {mapData && notes.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Patterns Detectados</span>
            <span className="text-[9px] text-gray-500">{notes.length} notas totais</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {snakeNoteCount > 0 && (
              <div className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border" style={{borderColor: "#22c55e33", backgroundColor: "#22c55e11", color: "#22c55e"}}>
                <span>🐍</span>
                <span>Snake: {snakeNoteCount}</span>
              </div>
            )}
            {otherNoteCount > 0 && (
              <div className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-[#222] text-gray-400">
                <span>Mix: {otherNoteCount}</span>
              </div>
            )}
            {(audioData?.sustainedEvents?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-green-500/20 text-green-400">
                <span>🎵 {audioData?.sustainedEvents?.length} zonas sustentadas detectadas</span>
              </div>
            )}
            {(audioData?.sections?.filter(s => s.type === "drop").length ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-red-500/20 text-red-400">
                <span>💥 {audioData?.sections?.filter(s => s.type === "drop").length} drops</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {[["🟩", "Verde = Snake/Sustain"], ["🟥", "Vermelho = Drop/Burst"], ["🟦", "Azul = Break/Intro"], ["⬛", "Preto = Silêncio"]].map(([icon, label]) => (
              <span key={label} className="text-[8px] text-gray-600">{icon} {label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
