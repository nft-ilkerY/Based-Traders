import { useEffect, useState } from 'react'
import { SignInButton, useProfile } from '@farcaster/auth-kit'

export default function FarcasterAuth() {
  const { isAuthenticated, profile } = useProfile()
  const [isInFarcaster, setIsInFarcaster] = useState(false)

  // Check if running inside Farcaster
  useEffect(() => {
    const checkFarcasterContext = () => {
      // Check for Farcaster context indicators
      const isFarcasterFrame = window.parent !== window
      setIsInFarcaster(isFarcasterFrame)
      console.log('Is in Farcaster:', isFarcasterFrame)
    }

    checkFarcasterContext()
  }, [])

  if (isAuthenticated && profile) {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-br from-[#8a63d2] to-[#6a4bb5] px-4 py-2 rounded-xl border border-purple-400/30">
        {profile.pfpUrl && (
          <img
            src={profile.pfpUrl}
            alt={profile.username}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            @{profile.username}
          </span>
          {profile.displayName && (
            <span className="text-xs text-purple-200">
              {profile.displayName}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Show Farcaster context info */}
      {isInFarcaster && !isAuthenticated && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2 text-sm text-purple-200">
          Running in Farcaster - Click to connect
        </div>
      )}

      {/* Farcaster Sign In Button - using official component */}
      <SignInButton
        onSuccess={({ fid, username }) => {
          console.log(`Farcaster auth success! Hello, ${username}! Your fid is ${fid}.`)
        }}
        onError={(error) => {
          console.error('Farcaster auth error:', error)
        }}
      />
    </div>
  )
}
