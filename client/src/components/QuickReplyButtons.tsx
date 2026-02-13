import type { Bucket } from '@/types/chat'

interface QuickReplyButtonsProps {
  onSelect: (bucket: Bucket) => void
}

const BUCKETS: { key: Bucket; label: string; icon: string }[] = [
  { key: 'love', label: 'Love & Relationships', icon: '💕' },
  { key: 'money', label: 'Money & Abundance', icon: '💎' },
  { key: 'purpose', label: 'My Life Purpose', icon: '🌟' },
  { key: 'someone', label: 'Someone Specific', icon: '🔮' },
]

export function QuickReplyButtons({ onSelect }: QuickReplyButtonsProps) {
  return (
    <div className="p-4 space-y-2">
      {BUCKETS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-medium text-left transition-all duration-200 hover:shadow-md flex items-center gap-3"
        >
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
