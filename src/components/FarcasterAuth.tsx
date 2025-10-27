import { useEffect, useCallback } from 'react'
import { SignInButton, useProfile } from '@farcaster/auth-kit'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function FarcasterAuth() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const {
    isAuthenticated,
    profile,
  } = useProfile()

  // Auto-connect to Farcaster mini app if available
  useEffect(() => {
    if (!isConnected) {
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp')
      if (farcasterConnector) {
        connect({ connector: farcasterConnector })
      }
    }
  }, [isConnected, connectors, connect])

  const getNonce = useCallback(async () => {
    const response = await fetch('/api/auth/nonce')
    const { nonce } = await response.json()
    return nonce
  }, [])

  const handleSuccess = useCallback(async (res: any) => {
    console.log('Farcaster auth success:', res)
    // Optionally verify the signature on your backend
  }, [])

  const handleError = useCallback((error: any) => {
    console.error('Farcaster auth error:', error)
  }, [])

  if (isAuthenticated && profile) {
    return (
      <div className="flex items-center gap-4">
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
        {isConnected && address && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <button
              onClick={() => disconnect()}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton
        nonce={getNonce}
        onSuccess={handleSuccess}
        onError={handleError}
      />
      <ConnectButton />
    </div>
  )
}
