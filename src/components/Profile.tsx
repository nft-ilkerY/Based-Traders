import { useEffect, useState } from 'react'
import { useProfile } from '@farcaster/auth-kit'
import { gameState } from '../lib/gameState'

interface ProfileStats {
  farcaster_username: string
  farcaster_fid: number
  display_name?: string
  pfp_url?: string
  cash: number
  high_score: number
  created_at: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  total_volume: number
  biggest_win: number
  biggest_loss: number
  avg_hold_time: number
  total_pnl: number
}

interface Trade {
  id: string
  type: 'LONG' | 'SHORT'
  entry_price: number
  close_price: number
  leverage: number
  size: number
  pnl: number
  opened_at: number
  closed_at: number
  is_liquidated: boolean
}

export default function Profile() {
  const { isAuthenticated, profile } = useProfile()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && profile?.username) {
      // Initialize player first
      gameState.initPlayer(profile.username).then(() => {
        loadProfileData()
      })

      // Reload every 5 seconds to stay in sync
      const interval = setInterval(() => {
        if (profile?.username) loadProfileData()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isAuthenticated, profile?.username])

  const loadProfileData = async () => {
    if (!profile?.username) return

    try {
      console.log('Loading profile for:', profile.username)

      // Get current player state from memory
      const playerState = gameState.getPlayerState(profile.username)
      console.log('Player state from memory:', playerState)

      if (!playerState) {
        console.log('No player state found, initializing...')
        await gameState.initPlayer(profile.username)
        setTimeout(loadProfileData, 100)
        return
      }

      // Try to fetch from API
      let statsData
      let tradesData = []

      try {
        const [statsRes, tradesRes] = await Promise.all([
          fetch(`http://localhost:3002/api/player/${profile.username}/stats`),
          fetch(`http://localhost:3002/api/positions/${profile.username}/closed`)
        ])

        console.log('Stats response status:', statsRes.status)
        console.log('Trades response status:', tradesRes.status)

        if (statsRes.ok) {
          statsData = await statsRes.json()
        }
        if (tradesRes.ok) {
          tradesData = await tradesRes.json()
        }

        console.log('Stats data from API:', statsData)
        console.log('Trades data from API:', tradesData)
      } catch (apiError) {
        console.log('API fetch failed, using memory data only:', apiError)
      }

      // Calculate stats from trades data
      const totalTrades = Array.isArray(tradesData) ? tradesData.length : (statsData?.total_trades || 0)
      const winningTrades = Array.isArray(tradesData)
        ? tradesData.filter(t => t.pnl > 0).length
        : (statsData?.winning_trades || 0)
      const losingTrades = Array.isArray(tradesData)
        ? tradesData.filter(t => t.pnl <= 0).length
        : (statsData?.losing_trades || 0)
      const totalVolume = Array.isArray(tradesData)
        ? tradesData.reduce((sum, t) => sum + t.size, 0)
        : (statsData?.total_volume || 0)
      const biggestWin = Array.isArray(tradesData) && tradesData.length > 0
        ? Math.max(...tradesData.map(t => t.pnl), 0)
        : (statsData?.biggest_win || 0)
      const biggestLoss = Array.isArray(tradesData) && tradesData.length > 0
        ? Math.min(...tradesData.map(t => t.pnl), 0)
        : (statsData?.biggest_loss || 0)
      const totalPnl = Array.isArray(tradesData)
        ? tradesData.reduce((sum, t) => sum + t.pnl, 0)
        : (statsData?.total_pnl || playerState.pnl)
      const avgHoldTime = Array.isArray(tradesData) && tradesData.length > 0
        ? tradesData.reduce((sum, t) => sum + (t.closed_at - t.opened_at), 0) / tradesData.length
        : (statsData?.avg_hold_time || 0)

      // Always use current player state values
      const finalStats: ProfileStats = {
        farcaster_username: playerState.username,
        farcaster_fid: statsData?.farcaster_fid || profile?.fid || 0,
        display_name: statsData?.display_name || profile?.displayName,
        pfp_url: statsData?.pfp_url || profile?.pfpUrl,
        cash: playerState.cash,
        high_score: Math.max(statsData?.high_score || 0, playerState.totalValue),
        created_at: statsData?.created_at || Date.now(),
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        total_volume: totalVolume,
        biggest_win: biggestWin,
        biggest_loss: biggestLoss,
        avg_hold_time: avgHoldTime,
        total_pnl: totalPnl
      }

      console.log('Final stats:', finalStats)

      setStats(finalStats)
      setTrades(Array.isArray(tradesData) ? tradesData.slice(0, 20) : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load profile:', error)
      setLoading(false)
    }
  }

  const getWinRate = (): string => {
    if (!stats || stats.total_trades === 0) return '0.0'
    return ((stats.winning_trades / stats.total_trades) * 100).toFixed(1)
  }

  const getAchievements = () => {
    const achievements = []

    if (stats) {
      if (stats.total_trades >= 1) achievements.push({ icon: '🎯', name: 'First Trade', desc: 'Made your first trade' })
      if (stats.total_trades >= 10) achievements.push({ icon: '📊', name: 'Trader', desc: 'Completed 10 trades' })
      if (stats.total_trades >= 50) achievements.push({ icon: '💼', name: 'Pro Trader', desc: 'Completed 50 trades' })
      if (stats.total_trades >= 100) achievements.push({ icon: '🏆', name: 'Master', desc: 'Completed 100 trades' })
      if (stats.winning_trades >= 10) achievements.push({ icon: '✅', name: 'Winner', desc: '10 winning trades' })
      if (stats.biggest_win >= 500) achievements.push({ icon: '💰', name: 'Big Win', desc: 'Won $500+ in one trade' })
      if (stats.high_score >= 2000) achievements.push({ icon: '🚀', name: 'Profit Maker', desc: 'Reached $2000 balance' })
      if (stats.high_score >= 5000) achievements.push({ icon: '💎', name: 'Diamond Hands', desc: 'Reached $5000 balance' })
      if (parseFloat(getWinRate()) >= 60) achievements.push({ icon: '🎖️', name: 'Sharp Trader', desc: '60%+ win rate' })
    }

    return achievements
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <div className="w-full min-h-screen p-4">
      {!isAuthenticated ? (
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-12 border border-gray-700/50 relative overflow-hidden backdrop-blur-xl shadow-2xl shadow-[#0000FF]/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0000FF] opacity-10 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#0000FF]/30">
                <span className="text-4xl">👤</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">Sign in with Farcaster</h2>
              <p className="text-gray-300 text-lg mb-8">
                Sign in with Farcaster to view your profile and trading statistics
              </p>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="max-w-7xl mx-auto text-center mt-20">
          <div className="text-2xl text-gray-400">Loading profile...</div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {/* Profile Header */}
          <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-8 border border-gray-700/50 mb-6 relative overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#0000FF] opacity-[0.08] rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-4">
                {stats?.pfp_url ? (
                  <img
                    src={stats.pfp_url}
                    alt={stats.farcaster_username}
                    className="w-24 h-24 rounded-2xl shadow-lg shadow-[#0000FF]/30"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0000FF] to-[#0000AA] flex items-center justify-center text-5xl shadow-lg shadow-[#0000FF]/30">
                    👤
                  </div>
                )}
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {stats?.display_name || '@' + stats?.farcaster_username}
                  </h2>
                  <p className="text-sm text-purple-400 bg-[#0a0c12]/50 px-3 py-1 rounded-lg inline-block">
                    @{stats?.farcaster_username}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    ⏰ Member since {stats ? formatDate(stats.created_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-2xl p-5 border border-gray-700/50 hover:border-[#0000FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0000FF]/10 backdrop-blur-sm group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl group-hover:scale-110 transition-transform">💵</span>
                <p className="text-gray-400 text-sm font-medium">Current Balance</p>
              </div>
              <p className="text-3xl font-bold">${stats?.cash.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-2xl p-5 border border-gray-700/50 hover:border-[#0000FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0000FF]/10 backdrop-blur-sm group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
                <p className="text-gray-400 text-sm font-medium">High Score</p>
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-[#0000FF] to-[#4444FF] bg-clip-text text-transparent">
                ${stats?.high_score.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-2xl p-5 border border-gray-700/50 hover:border-[#0000FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0000FF]/10 backdrop-blur-sm group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
                <p className="text-gray-400 text-sm font-medium">Total Trades</p>
              </div>
              <p className="text-3xl font-bold">{stats?.total_trades || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-2xl p-5 border border-gray-700/50 hover:border-[#0000FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0000FF]/10 backdrop-blur-sm group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl group-hover:scale-110 transition-transform">🎯</span>
                <p className="text-gray-400 text-sm font-medium">Win Rate</p>
              </div>
              <p className="text-3xl font-bold text-green-400">
                {stats && stats.total_trades > 0
                  ? ((stats.winning_trades / stats.total_trades) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <h3 className="text-xl font-bold">Trading Statistics</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Winning Trades</span>
                  <span className="font-bold text-green-400">{stats?.winning_trades || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Losing Trades</span>
                  <span className="font-bold text-red-400">{stats?.losing_trades || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <span className="text-gray-400">Total Volume</span>
                  <span className="font-bold">${stats?.total_volume.toFixed(0) || '0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total P&L</span>
                  <span className={`font-bold ${(stats?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(stats?.total_pnl || 0) >= 0 ? '+' : ''}${stats?.total_pnl.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <span className="text-gray-400">Biggest Win</span>
                  <span className="font-bold text-green-400">+${stats?.biggest_win.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Biggest Loss</span>
                  <span className="font-bold text-red-400">${stats?.biggest_loss.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <span className="text-gray-400">Avg Hold Time</span>
                  <span className="font-bold">{formatDuration(stats?.avg_hold_time || 0)}</span>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                  <span className="text-lg">🏆</span>
                </div>
                <h3 className="text-xl font-bold">Achievements</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {getAchievements().map((achievement, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-[#0a0c12] to-[#080911] rounded-2xl p-4 border border-gray-700/50 hover:border-[#0000FF]/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#0000FF]/20"
                  >
                    <div className="text-4xl mb-2">{achievement.icon}</div>
                    <div className="text-sm font-bold mb-1">{achievement.name}</div>
                    <div className="text-xs text-gray-500">{achievement.desc}</div>
                  </div>
                ))}
                {getAchievements().length === 0 && (
                  <div className="col-span-2 text-center text-gray-500 py-8">
                    Start trading to unlock achievements!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-gradient-to-br from-[#0f1117] to-[#0a0c12] rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0000FF] to-[#0000AA] rounded-lg flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <h3 className="text-xl font-bold">Recent Trades ({trades.length})</h3>
            </div>
            <div className="overflow-x-auto">
              {trades.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Entry</th>
                      <th className="pb-3">Exit</th>
                      <th className="pb-3">Leverage</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Duration</th>
                      <th className="pb-3">P&L</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-gray-800 hover:bg-[#0a0c12] transition-colors">
                        <td className="py-3">
                          <span className={`font-bold ${trade.type === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.type}
                          </span>
                          {trade.is_liquidated && (
                            <span className="ml-2 text-xs text-red-500">LIQ</span>
                          )}
                        </td>
                        <td className="py-3 font-mono">${trade.entry_price.toFixed(2)}</td>
                        <td className="py-3 font-mono">${trade.close_price.toFixed(2)}</td>
                        <td className="py-3">{trade.leverage}×</td>
                        <td className="py-3">${trade.size.toFixed(0)}</td>
                        <td className="py-3">{formatDuration(trade.closed_at - trade.opened_at)}</td>
                        <td className={`py-3 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(trade.closed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  No closed trades yet. Start trading to see your history!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
