import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface BackgroundMusicProps {
  // Where the toggle sits. The default keeps it pinned to the VIEWPORT's
  // bottom-right, which is what every page has always done.
  //
  // ⚠ On the upsell pages that default collides with the footer: the toggle is
  // 44×44 at bottom-4/right-4 and the CTA stack is full-width to right-4, so it
  // covers the last 11–13% of the decline button and of the shipping form's
  // submit — and being z-50 it WINS the tap there (measured 2026-08-07:
  // elementFromPoint at the toggle's centre returns the music icon, not the
  // button under it). Pass an absolute position to park it inside the message
  // area instead, clear of any footer.
  positionClass?: string
}

export function BackgroundMusic({
  positionClass = 'fixed bottom-4 right-4',
}: BackgroundMusicProps = {}) {
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
      data-testid="button-background-music"
      className={`${positionClass} p-3 bg-white/10 rounded-full text-white/60 hover:text-white/90 transition-colors z-50`}
      aria-label={isPlaying ? 'Mute music' : 'Unmute music'}
    >
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}
