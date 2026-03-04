import { Button } from '@/components/ui/button'

interface QuickReply {
  text: string
  value: string
}

interface QuickRepliesProps {
  replies: QuickReply[]
  onSelect: (reply: QuickReply) => void
  disabled?: boolean
}

export function QuickReplies({ replies, onSelect, disabled }: QuickRepliesProps) {
  return (
    <div className="p-4 flex flex-wrap gap-2 justify-center" data-testid="container-quick-replies">
      {replies.map((reply) => (
        <Button
          key={reply.value}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply)}
          disabled={disabled}
          data-testid={`button-quick-reply-${reply.value}`}
          className="
            rounded-full
            bg-white/10 
            border-white/20
            text-white
            hover:bg-purple-600/30 
            hover:border-purple-500
            hover:text-white
            transition-all 
            duration-200
          "
        >
          {reply.text}
        </Button>
      ))}
    </div>
  )
}
