import { useEffect, useState } from 'react'
import { priceEngine } from '../lib/priceEngine'
import { gameState } from '../lib/gameState'
import type { PlayerState } from '../lib/gameState'
import PriceChart from './PriceChart'
import PositionRow from './PositionRow'
import TradingControls from './TradingControls'

interface TradingInterfaceProps {
  profile: any
  isLoggedIn: boolean
}

export default function TradingInterface({ profile, isLoggedIn }: TradingInterfaceProps) {
  const [currentPrice, setCurrentPrice] = useState(100)
  const [priceHistory, setPriceHistory] = useState<number[]>([])
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [playerLoading, setPlayerLoading] = useState(false)

  // Load price history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/price')
        const data = await response.json()
        setPriceHistory(data.history || [])
        setCurrentPrice(data.price)
        setHistoryLoaded(true)
      } catch (error) {
        console.error('Failed to load price history:', error)
        setHistoryLoaded(true)
      }
    }
    loadHistory()
  }, [])

  // Initialize player when Farcaster connects
  useEffect(() => {
    if (isLoggedIn && profile?.username) {
      setPlayerLoading(true)

      fetch('/api/player/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          fid: profile.fid,
          displayName: profile.displayName,
          pfpUrl: profile.pfpUrl,
        }),
      })
      .then(response => response.json())
      .then(() => {
        if (profile.username) {
          return gameState.initPlayer(profile.username)
        }
      })
      .then(state => {
        if (state) {
          setPlayerState(state)
        }
        setPlayerLoading(false)
      })
      .catch(() => {
        setPlayerLoading(false)
      })
    }
  }, [isLoggedIn, profile?.username])

  // Subscribe to price updates
  useEffect(() => {
    if (!historyLoaded) return

    const unsubscribe = priceEngine.subscribe((price) => {
      setCurrentPrice(price)
      setPriceHistory((prev) => {
        // Only add if different from last price
        if (prev.length === 0 || prev[prev.length - 1] !== price) {
          return [...prev.slice(-49), price] // Keep last 50 prices
        }
        return prev
      })

      // Update player positions with new price
      if (profile?.username) {
        gameState.updatePrices(profile.username, price)
      }
    })

    priceEngine.start()

    return () => {
      unsubscribe()
      priceEngine.stop()
    }
  }, [profile?.username, historyLoaded])

  // Subscribe to player state updates
  useEffect(() => {
    if (!profile?.username) return

    const unsubscribe = gameState.subscribe((state) => {
      if (state.username === profile.username) {
        setPlayerState(state)
      }
    })

    return unsubscribe
  }, [profile?.username])

  return (
    <div className="w-full min-h-screen p-4">
      {!isLoggedIn ? (
        <div className="max-w-3xl mx-auto mt-10 sm:mt-20 text-center">
          <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-2xl sm:rounded-3xl p-6 sm:p-12 border border-gray-700/50 relative overflow-hidden backdrop-blur-xl shadow-2xl shadow-[#0000FF]/10">
            {/* Animated decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0000FF] opacity-10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4444FF] opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-[#0000FF]/30">
                <span className="text-3xl sm:text-4xl">⚡</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                Welcome to <span className="bg-gradient-to-r from-[#0000FF] to-[#4444FF] bg-clip-text text-transparent">Based</span> Traders
              </h2>
              <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-6 sm:mb-10 max-w-xl mx-auto px-2">
                Sign in with Farcaster to start trading with leverage. Get <span className="text-[#0000FF] font-bold">$1,000</span> virtual cash to trade with!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#0a0c12]/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-[#0000FF]/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#0000FF]/20">
                  <div className="text-5xl mb-3">📈</div>
                  <div className="text-lg font-bold mb-1">Long/Short</div>
                  <div className="text-sm text-gray-400">Trade both directions</div>
                </div>
                <div className="bg-[#0a0c12]/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-[#0000FF]/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#0000FF]/20">
                  <div className="text-5xl mb-3">⚡</div>
                  <div className="text-lg font-bold mb-1">Up to 10x Leverage</div>
                  <div className="text-sm text-gray-400">Amplify your gains</div>
                </div>
                <div className="bg-[#0a0c12]/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-[#0000FF]/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#0000FF]/20">
                  <div className="text-5xl mb-3">💰</div>
                  <div className="text-lg font-bold mb-1">$1000 Start</div>
                  <div className="text-sm text-gray-400">Free virtual capital</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">5% fee on profits only • Real-time price action</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {/* Trading Rules Info - Compact Banner */}
          <div className="bg-gradient-to-r from-[#0a0c12] via-[#0f1117] to-[#0a0c12] rounded-xl p-3 border border-[#0000FF]/20 backdrop-blur-sm shadow-md shadow-[#0000FF]/3 mb-6 relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0000FF]/5 to-transparent animate-pulse"></div>

            <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#0000FF]">💳</span>
                <span className="text-gray-400">Opening Fee:</span>
                <span className="font-semibold text-white">0.2-0.5%</span>
              </div>
              <div className="w-px h-4 bg-gray-700 hidden md:block"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#0000FF]">💸</span>
                <span className="text-gray-400">Closing Fee:</span>
                <span className="font-semibold text-white">0.2-0.5%</span>
              </div>
              <div className="w-px h-4 bg-gray-700 hidden md:block"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">💰</span>
                <span className="text-gray-400">Profit Fee:</span>
                <span className="font-semibold text-green-400">5%</span>
              </div>
              <div className="w-px h-4 bg-gray-700 hidden md:block"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-400">⏱️</span>
                <span className="text-gray-400">Funding Fee:</span>
                <span className="font-semibold text-yellow-400">0.05%/h</span>
              </div>
              <div className="w-px h-4 bg-gray-700 hidden md:block"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-400">🎯</span>
                <span className="text-gray-400">Max Collateral:</span>
                <span className="font-semibold text-blue-400">80%</span>
              </div>
              <div className="w-px h-4 bg-gray-700 hidden md:block"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400">🔒</span>
                <span className="text-gray-400">Position Limit:</span>
                <span className="font-semibold text-purple-400">1/token</span>
              </div>
            </div>
          </div>

          {/* Portfolio Stats - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">💵</span>
                <p className="text-gray-400 text-xs font-medium">Cash</p>
              </div>
              <p className="text-lg font-bold">
                {playerLoading ? '...' : playerState ? `$${playerState.cash.toFixed(2)}` : '$1,000.00'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">💎</span>
                <p className="text-gray-400 text-xs font-medium">Total Value</p>
              </div>
              <p className="text-lg font-bold">
                {playerLoading ? '...' : playerState ? `$${playerState.totalValue.toFixed(2)}` : '$1,000.00'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{playerState && playerState.pnl >= 0 ? '📈' : '📉'}</span>
                <p className="text-gray-400 text-xs font-medium">P&L</p>
              </div>
              <p
                className={`text-lg font-bold ${
                  playerState && playerState.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {playerLoading ? '...' : playerState ? `${playerState.pnl >= 0 ? '+' : ''}$${playerState.pnl.toFixed(2)}` : '$0.00'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-xl p-3 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">⚡</span>
                <p className="text-gray-400 text-xs font-medium">P&L %</p>
              </div>
              <p
                className={`text-lg font-bold ${
                  playerState && playerState.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {playerLoading ? '...' : playerState ? `${playerState.pnlPercent >= 0 ? '+' : ''}${playerState.pnlPercent.toFixed(2)}%` : '0.00%'}
              </p>
            </div>
          </div>

          {/* Main Layout: Chart on Left, Controls on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Side: Chart (3/5 width on large screens) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Chart */}
              <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-none md:rounded-3xl overflow-hidden border-0 md:border md:border-gray-700/50 relative backdrop-blur-sm shadow-md shadow-[#0000FF]/3">
                {/* Subtle decorative gradient */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#0000FF] opacity-[0.08] rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-center p-4 md:p-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">BATR/USD</h2>
                      <span className="text-xs text-gray-500">Based Traders Token</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      ${currentPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Live Price</div>
                  </div>
                </div>
                <PriceChart data={priceHistory} />
              </div>

              {/* Open Positions - Below Chart */}
              {playerState && playerState.positions.length > 0 && (
                <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-md shadow-[#0000FF]/3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                      <span className="text-lg">📋</span>
                    </div>
                    <h3 className="text-xl font-bold">
                      Open Positions ({playerState.positions.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {playerState.positions.map((position) => (
                      <PositionRow
                        key={position.id}
                        position={position}
                        onClose={async (id) => {
                          if (profile?.username) {
                            await gameState.closePosition(profile.username, id)
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Trading Controls (2/5 width on large screens) */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-6 border border-gray-700/50 relative overflow-hidden backdrop-blur-sm shadow-md shadow-[#0000FF]/3 sticky top-4">
                {/* Subtle decorative gradient */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-[#0000FF] opacity-[0.08] rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold">Open New Position</h3>
                </div>
                {playerState && profile?.username && (
                  <TradingControls
                    playerCash={playerState.cash}
                    playerTotalValue={playerState.totalValue}
                    onOpenPosition={async (amount, leverage, type) => {
                      if (profile.username) {
                        await gameState.openPosition(profile.username, amount, leverage, type, currentPrice, 'BATR')
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
