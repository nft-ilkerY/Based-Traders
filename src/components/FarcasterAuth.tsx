import { SignInButton, useProfile } from '@farcaster/auth-kit'

export default function FarcasterAuth() {
  const { isAuthenticated, profile } = useProfile()

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

  return (
    <div className="w-full sm:w-auto">
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
