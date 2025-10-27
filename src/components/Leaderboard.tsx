import { useEffect, useState } from 'react'
import FarcasterAuth from './FarcasterAuth'

interface LeaderboardEntry {
  farcaster_username: string
  display_name?: string
  pfp_url?: string
  high_score: number
  rank: string
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()

    // Refresh every 10 seconds
    const interval = setInterval(loadLeaderboard, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/leaderboard')
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-gray-300'
    if (rank === 3) return 'text-orange-400'
    return 'text-gray-400'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="w-full min-h-screen p-4 bg-gradient-to-br from-[#090a0f] via-[#0a0b10] to-[#0b0c11]">
      {/* Header with modern design */}
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-xl flex items-center justify-center shadow-lg shadow-[#0000FF]/20">
            <span className="text-2xl">⚡</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              <span className="bg-gradient-to-r from-[#0000FF] to-[#4444FF] bg-clip-text text-transparent">Based</span> Traders
            </h1>
            <p className="text-gray-400 text-sm mt-1">Real-time Trading on Base Chain</p>
          </div>
        </div>
        <FarcasterAuth />
      </header>

      <div className="max-w-5xl mx-auto">
        {/* Leaderboard Header */}
        <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-8 border border-gray-700/50 mb-6 relative overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#0000FF] opacity-[0.08] rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0000FF]/30">
                <span className="text-4xl">🏆</span>
              </div>
              <div>
                <h2 className="text-4xl font-bold">Leaderboard</h2>
                <p className="text-gray-400 text-sm mt-1">Top 100 traders by highest balance achieved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
          {loading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-xl">Loading leaderboard...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-xl mb-2">No traders yet!</div>
              <p className="text-sm">Be the first to start trading and claim the top spot</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                    <th className="pb-4 w-20">Rank</th>
                    <th className="pb-4">Trader</th>
                    <th className="pb-4 text-right">High Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const rank = index + 1
                    const isTopThree = rank <= 3

                    return (
                      <tr
                        key={entry.farcaster_username}
                        className={`border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-[#0000FF]/5 hover:to-transparent transition-all duration-300 ${
                          isTopThree ? 'bg-gradient-to-r from-[#0000FF]/10 to-transparent' : ''
                        }`}
                      >
                        <td className="py-5">
                          <div className={`text-3xl font-bold ${getRankColor(rank)} flex items-center gap-2`}>
                            {getRankIcon(rank)}
                          </div>
                        </td>
                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            {entry.pfp_url ? (
                              <img
                                src={entry.pfp_url}
                                alt={entry.farcaster_username}
                                className="w-10 h-10 rounded-lg"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center text-lg">
                                👤
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-bold text-white">
                                {entry.display_name || '@' + entry.farcaster_username}
                              </div>
                              <div className="text-xs text-purple-400">
                                @{entry.farcaster_username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 text-right">
                          <div className={`text-2xl font-bold ${isTopThree ? 'bg-gradient-to-r from-[#0000FF] to-[#4444FF] bg-clip-text text-transparent' : 'text-white'}`}>
                            ${entry.high_score.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-2xl p-5 border border-gray-700/50 backdrop-blur-sm shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💡</span>
            </div>
            <div className="text-sm text-gray-400">
              <p className="mb-2">
                <strong className="text-white font-bold">High Score</strong> is the highest balance you've ever reached during your trading journey.
              </p>
              <p>
                Keep trading and managing your positions wisely to climb the leaderboard and compete with the best traders!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
