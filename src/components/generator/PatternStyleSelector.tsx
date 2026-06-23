"use client"

interface Pattern {
  id: string;
  label: string;
  description: string;
}

const PATTERNS: Pattern[] = [
  {
    id: "snake",
    label: "Snake",
    description: "Trilha contínua e suave, ideal para vocais sustentados",
  },
  {
    id: "stairs",
    label: "Stairs",
    description: "Escadas diagonais, ótimo para build-ups",
  },
  {
    id: "jumps",
    label: "Jumps",
    description: "Pulos entre cantos opostos, para kicks e batidas secas",
  },
  {
    id: "bursts",
    label: "Bursts",
    description: "Explosivo e caótico, obrigatório para drops intensos",
  },
  {
    id: "rotation",
    label: "Rotation",
    description: "Rotação fluida pelas bordas, preenche tensão",
  },
  {
    id: "calm_center",
    label: "Calm",
    description: "Notas relaxadas no centro, perfeito para breaks",
  },
  {
    id: "simple_diagonal",
    label: "Diagonal",
    description: "Padrão diagonal clássico e rítmico",
  },
];

interface PatternStyleSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function PatternStyleSelector({ selected, onChange }: PatternStyleSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      // Don't allow deselecting the last one
      if (selected.length === 1) return;
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(PATTERNS.map(p => p.id));
  const selectNone = () => onChange(["simple_diagonal"]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs text-gray-400 font-medium">
          Allowed Patterns
        </label>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-[10px] text-gray-500 hover:text-white transition-colors">
            All
          </button>
          <span className="text-[10px] text-gray-600">|</span>
          <button onClick={selectNone} className="text-[10px] text-gray-500 hover:text-white transition-colors">
            Default
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {PATTERNS.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              title={p.description}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all duration-150
                ${isSelected
                  ? "bg-[#18181b] border-blue-500 text-white"
                  : "bg-[#0a0a0c] border-[#27272a] text-gray-500 hover:border-[#3f3f46] hover:text-gray-300"
                }
              `}
            >
              <div className="min-w-0">
                <div className={`text-xs font-medium leading-none mb-1 ${isSelected ? "text-white" : "text-gray-400"}`}>
                  {p.label}
                </div>
                <div className="text-[9px] leading-tight opacity-70 truncate">{p.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-[10px] text-gray-500">
        {selected.length} of {PATTERNS.length} selected · AI prioritizes cohesive choreography.
      </div>
    </div>
  );
}

export const ALL_PATTERN_IDS = PATTERNS.map(p => p.id);
export type PatternId = typeof PATTERNS[number]["id"];
