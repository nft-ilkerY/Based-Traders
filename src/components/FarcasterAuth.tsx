import { useState, useEffect } from 'react'
import { SignInButton, useProfile } from '@farcaster/auth-kit'
import sdk from '@farcaster/frame-sdk'

interface FarcasterAuthProps {
  onFrameLogin?: (frameUser: any) => void
}

export default function FarcasterAuth({ onFrameLogin }: FarcasterAuthProps) {
  const { isAuthenticated, profile } = useProfile()
  const [frameContext, setFrameContext] = useState<any>(null)

  // Check for frame context on mount
  useEffect(() => {
    const checkFrameContext = async () => {
      try {
        const context = await sdk.context
        if (context?.user) {
          setFrameContext(context.user)
        }
      } catch (error) {
        // Not in frame
      }
    }
    checkFrameContext()
  }, [])

  const handleFrameSignIn = () => {
    if (frameContext && onFrameLogin) {
      onFrameLogin(frameContext)
    }
  }

  if (isAuthenticated && profile) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-br from-[#8a63d2] to-[#6a4bb5] px-3 sm:px-4 py-2 rounded-xl border border-purple-400/30 w-full sm:w-auto">
        {profile.pfpUrl && (
          <img
            src={profile.pfpUrl}
            alt={profile.username}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-semibold text-white truncate">
            @{profile.username}
          </span>
          {profile.displayName && (
            <span className="text-[10px] sm:text-xs text-purple-200 truncate">
              {profile.displayName}
            </span>
          )}
        </div>
      </div>
    )
  }

  // If in Farcaster app, show simple sign in button
  if (frameContext) {
    return (
      <button
        onClick={handleFrameSignIn}
        className="bg-[#8a63d2] hover:bg-[#7a53c2] text-white font-semibold py-2 px-4 rounded-xl transition-colors"
      >
        Sign in
      </button>
    )
  }

  // Default: QR code sign in
  return (
    <div className="w-full sm:w-auto">
      <SignInButton />
    </div>
  )
}
