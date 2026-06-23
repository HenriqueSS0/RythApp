import { cn } from "@/lib/utils"

interface DemoMapGridProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function DemoMapGrid({ className, size = "md" }: DemoMapGridProps) {
  const gridClasses = {
    sm: "gap-1 p-1 w-32 h-32",
    md: "gap-2 p-2 w-48 h-48",
    lg: "gap-3 p-3 w-64 h-64",
  }

  const cellClasses = {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
  }

  const glowingCells = [2, 3, 4, 7]

  return (
    <div className={cn("grid grid-cols-3", gridClasses[size], className)}>
      {Array.from({ length: 9 }).map((_, i) => {
        const isGlowing = glowingCells.includes(i)
        
        return (
          <div 
            key={i} 
            className={cn(
              "bg-[#111] border border-[#222] relative flex items-center justify-center transition-all duration-300",
              cellClasses[size]
            )}
          >
            {isGlowing && (
              <div className="w-1/3 h-1/3 rounded-full dot-glow" />
            )}
          </div>
        )
      })}
    </div>
  )
}
