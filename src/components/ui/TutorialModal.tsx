"use client"
import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_IMAGES = [
  "/tut1.png",
  "/tut2.png",
  "/tut3.png",
  "/tut4.png"
];

const TUTORIAL_TEXTS = [
  "Acesse openrouter.ai e crie sua conta (ou faça login).",
  "Navegue até a página de Keys e clique em 'Create Key'.",
  "Por segurança, recomendamos definir um 'Credit limit' de US$ 0.01.",
  "Copie a chave gerada e cole no aplicativo."
];

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < TUTORIAL_IMAGES.length - 1) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0c] border border-[#27272a] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
          <h3 className="text-white font-medium">Como obter sua API Key</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#18181b] rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          
          <div className="relative w-full aspect-video bg-[#18181b] rounded-xl border border-[#27272a] overflow-hidden mb-6 flex items-center justify-center">
            {/* Image Placeholder/Renderer */}
            <Image 
              src={TUTORIAL_IMAGES[currentStep]} 
              alt={`Tutorial passo ${currentStep + 1}`}
              width={800}
              height={450}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback se a imagem não existir ainda
                (e.target as HTMLImageElement).style.display = 'none';
                e.currentTarget.parentElement?.classList.add('fallback-bg');
              }}
            />
            
            <style jsx>{`
              .fallback-bg::before {
                content: "Coloque a imagem " counter(step) " em public/tutorial/" attr(data-step) ".png";
                color: #52525b;
                font-family: monospace;
                font-size: 12px;
              }
            `}</style>
            
            {/* Arrows */}
            <button 
              onClick={prevStep}
              disabled={currentStep === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-black/50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextStep}
              disabled={currentStep === TUTORIAL_IMAGES.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-black/50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="text-center h-12">
            <p className="text-gray-300 font-medium">{TUTORIAL_TEXTS[currentStep]}</p>
          </div>

        </div>

        {/* Footer / Pagination */}
        <div className="p-4 bg-[#18181b] border-t border-[#27272a] flex items-center justify-between">
          <div className="flex gap-1.5">
            {TUTORIAL_IMAGES.map((_, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-blue-500' : 'bg-[#3f3f46]'}`}
              />
            ))}
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Fechar
            </button>
            {currentStep < TUTORIAL_IMAGES.length - 1 ? (
              <button onClick={nextStep} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Próximo
              </button>
            ) : (
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Entendi
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
