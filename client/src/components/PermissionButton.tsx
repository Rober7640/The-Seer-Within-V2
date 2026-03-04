interface PermissionButtonProps {
  onClick: () => void
}

export function PermissionButton({ onClick }: PermissionButtonProps) {
  return (
    <div className="p-4">
      <button
        onClick={onClick}
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        Yes, please help me Evelyn!
      </button>
    </div>
  )
}
