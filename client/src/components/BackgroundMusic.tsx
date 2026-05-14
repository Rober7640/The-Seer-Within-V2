import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/ambient.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = 0.3

    // Start on first user interaction
    const startAudio = () => {
      if (!hasStarted && audioRef.current) {
        audioRef.current.play().catch(console.error)
        setHasStarted(true)
        setIsPlaying(true)
      }
    }

    document.addEventListener('click', startAudio, { once: true })

    return () => {
      document.removeEventListener('click', startAudio)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [hasStarted])

  const toggleAudio = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(console.error)
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <button
      onClick={toggleAudio}
      className="fixed bottom-4 right-4 p-3 bg-white/10 rounded-full text-white/60 hover:text-white/90 transition-colors z-50"
      aria-label={isPlaying ? 'Mute music' : 'Unmute music'}
    >
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}
