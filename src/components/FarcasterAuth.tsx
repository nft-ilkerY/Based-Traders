import { useEffect, useCallback, useState } from 'react'
import { useSignIn, useProfile } from '@farcaster/auth-kit'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function FarcasterAuth() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { isAuthenticated, profile } = useProfile()
  const [showFarcasterLogin, setShowFarcasterLogin] = useState(false)

  const {
    signIn,
    // @ts-ignore
    url: farcasterUrl,
    isSuccess,
    isError,
  } = useSignIn({
    onSuccess: (res) => {
      console.log('Farcaster auth success:', res)
      setShowFarcasterLogin(false)
    },
    onError: (error) => {
      console.error('Farcaster auth error:', error)
    },
  })

  // Auto-connect to Farcaster mini app if available
  useEffect(() => {
    if (!isConnected) {
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp')
      if (farcasterConnector) {
        connect({ connector: farcasterConnector })
      }
    }
  }, [isConnected, connectors, connect])

  // Open QR modal when URL is ready
  useEffect(() => {
    if (farcasterUrl) {
      setShowFarcasterLogin(true)
    }
  }, [farcasterUrl])

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
      {/* Custom Farcaster Sign In Button */}
      <button
        onClick={() => signIn()}
        className="flex items-center gap-3 bg-gradient-to-r from-[#8a63d2] to-[#6a4bb5] hover:from-[#9b74e3] hover:to-[#7b5cc6] px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 border border-purple-400/30"
      >
        <svg width="20" height="20" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="1000" rx="200" fill="white"/>
          <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" fill="#855DCD"/>
          <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V351.111H331.111L360 253.333H128.889Z" fill="#855DCD"/>
          <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H648.889L677.778 351.111H702.222V746.667H675.556Z" fill="#855DCD"/>
        </svg>
        <span>Sign In with Farcaster</span>
      </button>

      {/* QR Code Modal */}
      {showFarcasterLogin && farcasterUrl && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowFarcasterLogin(false)}
        >
          <div
            className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-8 border border-gray-700/50 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8a63d2] to-[#6a4bb5] rounded-xl flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" fill="white"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Sign In with Farcaster</h3>
              </div>
              <button
                onClick={() => setShowFarcasterLogin(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl mb-4">
              <img
                src={farcasterUrl}
                alt="Farcaster QR Code"
                className="w-full h-auto"
              />
            </div>

            <div className="space-y-3">
              <p className="text-gray-300 text-sm text-center">
                Scan this QR code with your Farcaster app to sign in
              </p>
              <a
                href={farcasterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gradient-to-r from-[#8a63d2] to-[#6a4bb5] hover:from-[#9b74e3] hover:to-[#7b5cc6] px-4 py-3 rounded-xl font-semibold transition-all duration-300"
              >
                Open in Warpcast
              </a>
            </div>
          </div>
        </div>
      )}

      <ConnectButton />
    </div>
  )
}
