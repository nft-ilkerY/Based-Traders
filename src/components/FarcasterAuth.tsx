interface FarcasterAuthProps {
  onAuth: () => void
}

export default function FarcasterAuth({ onAuth }: FarcasterAuthProps) {
  return (
    <button
      onClick={onAuth}
      className="bg-[#8a63d2] hover:bg-[#7a53c2] text-white font-semibold py-2 px-4 rounded-xl transition-colors"
    >
      Sign in
    </button>
  )
}
