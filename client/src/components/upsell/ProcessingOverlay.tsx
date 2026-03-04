import { Loader2 } from 'lucide-react'

interface ProcessingOverlayProps {
  message?: string
}

export function ProcessingOverlay({ message = "Processing your protection..." }: ProcessingOverlayProps) {
  return (
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      data-testid="overlay-processing"
    >
      <div className="bg-slate-800/90 rounded-2xl p-8 text-center shadow-2xl" data-testid="card-processing">
        <div className="mb-4" data-testid="container-spinner">
          <Loader2 
            className="h-12 w-12 text-purple-500 mx-auto animate-spin" 
            data-testid="spinner-processing"
          />
        </div>
        
        <p className="text-foreground/80 text-lg" data-testid="text-processing-message">{message}</p>
      </div>
    </div>
  )
}
