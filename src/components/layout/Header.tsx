import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Activity } from "lucide-react"

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-panel-border">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-white" />
          <span className="font-bold text-lg tracking-tight text-white">
            Rhythia AutoMapper
          </span>
        </Link>
        <nav className="hidden md:flex gap-8">
          <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Recursos
          </Link>
          <Link href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Como Funciona
          </Link>
          <Link href="#preview" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Demo
          </Link>
        </nav>
        <div className="flex gap-4">
          <Link href="/generator">
            <Button variant="outline" size="sm" className="hidden sm:flex border-panel-border text-gray-300 hover:text-white rounded-lg">
              Ver Demo
            </Button>
          </Link>
          <Link href="/generator">
            <Button size="sm" className="bg-[#2c3e50] text-white hover:bg-[#34495e] rounded-lg">Abrir Gerador</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
