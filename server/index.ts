import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import db from './db'
import { calculateRank } from './rankSystem'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

// Global Price Engine (Server-side)
class GlobalPriceEngine {
  private price: number
  private volatility: number = 0.004 // Base volatility - HIGH dynamic movement
  private trend: number = 0 // Current trend: positive = bullish, negative = bearish
  private trendChangeCounter: number = 0 // Counter to change trend periodically
  private consecutiveBullish: number = 0 // Track consecutive bullish trends
  private consecutiveBearish: number = 0 // Track consecutive bearish trends
  private smallMoveProbability: number = 0.03 // 3% chance - very frequent small moves
  private mediumMoveProbability: number = 0.008 // 0.8% chance - frequent medium moves
  private bigMoveProbability: number = 0.0005 // 0.05% chance - occasional big moves
  private crashProbability: number = 0.0008 // 0.08% chance - rare but present
  private pumpProbability: number = 0.0008 // 0.08% chance - rare but present
  private intervalId: NodeJS.Timeout | null = null
  private startTime: number = Date.now() // Track when engine started

  // Price boundaries
  private minPrice: number = 50 // Soft minimum
  private maxPrice: number = 600 // Soft maximum
  private absoluteMinPrice: number = 40 // Hard floor (rare to hit)
  private absoluteMaxPrice: number = 700 // Hard ceiling (rare to hit)

  constructor() {
    const lastPrice = db.prepare('SELECT price FROM price_history ORDER BY timestamp DESC LIMIT 1').get() as { price: number } | undefined
    this.price = lastPrice?.price || 100 // Start at $100
    this.trend = -0.0002 // Start with slight bearish trend
    console.log(`🚀 Global Price Engine initialized at $${this.price.toFixed(2)}`)
  }

  start() {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      this.updatePrice()
    }, 1000)

    console.log('✅ Global Price Engine started')
  }

  private updatePrice() {
    const oldPrice = this.price
    const elapsedMinutes = (Date.now() - this.startTime) / 1000 / 60 // Minutes since start

    // Apply boundary pressure - push price back towards range if outside
    let boundaryPressure = 0
    if (this.price < this.minPrice) {
      // Below soft min: apply upward pressure
      const distanceBelow = this.minPrice - this.price
      boundaryPressure = Math.min(distanceBelow * 0.002, 0.001) // Stronger pressure the further below
      console.log(`⬆️ Below min ($${this.minPrice}), applying upward pressure`)
    } else if (this.price > this.maxPrice) {
      // Above soft max: apply downward pressure
      const distanceAbove = this.price - this.maxPrice
      boundaryPressure = -Math.min(distanceAbove * 0.002, 0.001) // Stronger pressure the further above
      console.log(`⬇️ Above max ($${this.maxPrice}), applying downward pressure`)
    }

    // Dynamic trend based on time and boundaries
    let baseTrend = boundaryPressure
    if (elapsedMinutes < 5) {
      // First 5 minutes: slight downward trend
      baseTrend += -0.0002
    } else if (elapsedMinutes < 10) {
      // 5-10 minutes: sideways/consolidation
      baseTrend += 0
    } else {
      // After 10 minutes: gradually increasing bullish trend
      const bullishStrength = Math.min((elapsedMinutes - 10) / 30, 1) // Max out at 40 minutes
      baseTrend += 0.0001 + (bullishStrength * 0.0002)
    }

    // Change trend every 60-180 seconds (add randomness on top of base trend)
    this.trendChangeCounter++
    if (this.trendChangeCounter > 60 + Math.random() * 120) {
      const randomTrend = (Math.random() - 0.5) * 0.0002
      let newTrend = baseTrend + randomTrend

      // Track consecutive trends
      const isBullish = newTrend > 0
      const isBearish = newTrend < 0

      // Update counters
      if (isBullish) {
        this.consecutiveBullish++
        this.consecutiveBearish = 0
      } else if (isBearish) {
        this.consecutiveBearish++
        this.consecutiveBullish = 0
      }

      // Force reversal after 2-3 consecutive same trends
      if (this.consecutiveBullish >= 2 && Math.random() > 0.3) {
        // Force bearish
        newTrend = -Math.abs(newTrend) - 0.0001
        this.consecutiveBullish = 0
        this.consecutiveBearish = 1
        console.log(`🔄 FORCED REVERSAL: Bullish -> Bearish (after ${this.consecutiveBullish} bullish trends)`)
      } else if (this.consecutiveBearish >= 2 && Math.random() > 0.3) {
        // Force bullish
        newTrend = Math.abs(newTrend) + 0.0001
        this.consecutiveBearish = 0
        this.consecutiveBullish = 1
        console.log(`🔄 FORCED REVERSAL: Bearish -> Bullish (after ${this.consecutiveBearish} bearish trends)`)
      }

      this.trend = newTrend
      this.trendChangeCounter = 0
      console.log(`🔄 Trend changed: ${this.trend > 0 ? 'BULLISH' : 'BEARISH'} (base: ${baseTrend.toFixed(6)}, time: ${elapsedMinutes.toFixed(1)}m, bull: ${this.consecutiveBullish}, bear: ${this.consecutiveBearish})`)
    }

    // CRASH (sudden drop 3-8% - liquidates longs) - Less likely in early bearish phase
    const crashChance = elapsedMinutes < 5 ? this.crashProbability * 0.3 : this.crashProbability
    const pumpChance = elapsedMinutes > 10 ? this.pumpProbability * 1.5 : this.pumpProbability

    if (Math.random() < crashChance) {
      const dropPercent = 0.02 + Math.random() * 0.03 // 2-5%
      this.price = this.price * (1 - dropPercent)
      console.log(`💥💥💥 CRASH! $${oldPrice.toFixed(2)} -> $${this.price.toFixed(2)} (-${(dropPercent * 100).toFixed(1)}%)`)
    }
    // PUMP (sudden rise 2-5%) - More likely after 10 minutes
    else if (Math.random() < pumpChance) {
      const risePercent = 0.02 + Math.random() * 0.03 // 2-5%
      this.price = this.price * (1 + risePercent)
      console.log(`🚀🚀🚀 PUMP! $${oldPrice.toFixed(2)} -> $${this.price.toFixed(2)} (+${(risePercent * 100).toFixed(1)}%)`)
    }
    // Big move (rare, $30-80) - Only after 20 minutes
    else if (elapsedMinutes > 20 && Math.random() < this.bigMoveProbability) {
      const amount = 30 + Math.random() * 50
      const direction = Math.random() > 0.5 ? 1 : -1
      this.price = this.price + (amount * direction)
      console.log(`${direction > 0 ? '🚀🚀' : '💥💥'} BIG! $${oldPrice.toFixed(2)} -> $${this.price.toFixed(2)} (${direction > 0 ? '+' : ''}$${(amount * direction).toFixed(2)})`)
    }
    // Medium move (frequent, $5-15)
    else if (Math.random() < this.mediumMoveProbability) {
      const amount = 5 + Math.random() * 10
      const direction = Math.random() > 0.5 ? 1 : -1
      this.price = this.price + (amount * direction)
      console.log(`${direction > 0 ? '📈' : '📉'} Medium: $${oldPrice.toFixed(2)} -> $${this.price.toFixed(2)} (${direction > 0 ? '+' : ''}$${(amount * direction).toFixed(2)})`)
    }
    // Small move (very frequent, $1-4)
    else if (Math.random() < this.smallMoveProbability) {
      const amount = 1 + Math.random() * 3
      const direction = Math.random() > 0.5 ? 1 : -1
      this.price = this.price + (amount * direction)
    }
    // Normal tiny movement with trend
    else {
      const randomComponent = (Math.random() - 0.5) * 2 * this.volatility
      const change = this.trend + randomComponent
      this.price = this.price * (1 + change)
    }

    // Apply hard boundaries (absolute limits)
    this.price = Math.max(this.absoluteMinPrice, Math.min(this.absoluteMaxPrice, this.price))

    this.savePrice()
    this.broadcastPrice()
  }

  private savePrice() {
    // Insert new price
    db.prepare('INSERT INTO price_history (price, timestamp) VALUES (?, ?)').run(
      this.price,
      Date.now()
    )

    // Keep only last 300 records (5 minutes of history)
    const count = db.prepare('SELECT COUNT(*) as count FROM price_history').get() as { count: number }
    if (count.count > 300) {
      // Delete oldest records, keep last 300
      db.prepare(`
        DELETE FROM price_history
        WHERE id NOT IN (
          SELECT id FROM price_history
          ORDER BY timestamp DESC
          LIMIT 300
        )
      `).run()
    }
  }

  private broadcastPrice() {
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({ price: this.price, timestamp: Date.now() }))
      }
    })
  }

  getCurrentPrice() {
    return this.price
  }

  getPriceHistory(limit: number = 120) {
    const rows = db.prepare('SELECT price FROM price_history ORDER BY timestamp DESC LIMIT ?').all(limit) as { price: number }[]
    return rows.reverse().map(r => r.price)
  }
}

const priceEngine = new GlobalPriceEngine()
priceEngine.start()

// API Routes
app.get('/api/price', (req, res) => {
  res.json({
    price: priceEngine.getCurrentPrice(),
    history: priceEngine.getPriceHistory(120),
    timestamp: Date.now()
  })
})

// Player endpoints - using Farcaster username
app.get('/api/player/:username', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE farcaster_username = ?').get(req.params.username)

  if (!player) {
    // Return null - player should be created via POST with full Farcaster profile
    return res.json(null)
  }

  res.json(player)
})

app.post('/api/player/create', (req, res) => {
  const { username, fid, displayName, pfpUrl } = req.body

  // Check if player already exists
  const existing = db.prepare('SELECT * FROM players WHERE farcaster_username = ?').get(username)

  if (existing) {
    // Update profile info if changed
    db.prepare('UPDATE players SET farcaster_fid = ?, display_name = ?, pfp_url = ?, updated_at = ? WHERE farcaster_username = ?').run(
      fid,
      displayName,
      pfpUrl,
      Date.now(),
      username
    )
    return res.json(existing)
  }

  // Create new player with $1000 starting cash
  db.prepare('INSERT INTO players (farcaster_username, farcaster_fid, display_name, pfp_url, cash, high_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    username,
    fid,
    displayName,
    pfpUrl,
    1000,
    1000,
    Date.now(),
    Date.now()
  )

  const newPlayer = db.prepare('SELECT * FROM players WHERE farcaster_username = ?').get(username)
  res.json(newPlayer)
})

app.post('/api/player/:username/update', (req, res) => {
  const { cash, high_score } = req.body

  db.prepare('UPDATE players SET cash = ?, high_score = ?, updated_at = ? WHERE farcaster_username = ?').run(
    cash,
    high_score,
    Date.now(),
    req.params.username
  )

  res.json({ success: true })
})

// Position endpoints
app.post('/api/position/open', (req, res) => {
  const { id, player_username, type, entry_price, leverage, size, collateral } = req.body

  db.prepare('INSERT INTO positions (id, player_username, type, entry_price, leverage, size, collateral, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id,
    player_username,
    type,
    entry_price,
    leverage,
    size,
    collateral,
    Date.now()
  )

  res.json({ success: true })
})

app.post('/api/position/close', (req, res) => {
  const { id, close_price, pnl, is_liquidated } = req.body

  db.prepare('UPDATE positions SET closed_at = ?, close_price = ?, pnl = ?, is_liquidated = ? WHERE id = ?').run(
    Date.now(),
    close_price,
    pnl,
    is_liquidated ? 1 : 0,
    id
  )

  res.json({ success: true })
})

app.get('/api/positions/:username', (req, res) => {
  const positions = db.prepare('SELECT * FROM positions WHERE player_username = ? ORDER BY opened_at DESC').all(req.params.username)
  res.json(positions)
})

// Get closed positions for a player
app.get('/api/positions/:username/closed', (req, res) => {
  const positions = db.prepare('SELECT * FROM positions WHERE player_username = ? AND closed_at IS NOT NULL ORDER BY closed_at DESC').all(req.params.username)
  res.json(positions)
})

// Get player stats
app.get('/api/player/:username/stats', (req, res) => {
  const username = req.params.username

  // Get player basic info
  const player = db.prepare('SELECT * FROM players WHERE farcaster_username = ?').get(username) as any

  if (!player) {
    return res.json({
      farcaster_username: username,
      cash: 1000,
      high_score: 1000,
      created_at: Date.now(),
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_volume: 0,
      biggest_win: 0,
      biggest_loss: 0,
      avg_hold_time: 0,
      total_pnl: 0
    })
  }

  // Get all closed positions
  const closedPositions = db.prepare('SELECT * FROM positions WHERE player_username = ? AND closed_at IS NOT NULL').all(username) as any[]

  // Calculate stats
  const total_trades = closedPositions.length
  const winning_trades = closedPositions.filter(p => p.pnl > 0).length
  const losing_trades = closedPositions.filter(p => p.pnl <= 0).length
  const total_volume = closedPositions.reduce((sum, p) => sum + p.size, 0)
  const biggest_win = Math.max(...closedPositions.map(p => p.pnl), 0)
  const biggest_loss = Math.min(...closedPositions.map(p => p.pnl), 0)
  const total_pnl = closedPositions.reduce((sum, p) => sum + p.pnl, 0)
  const avg_hold_time = total_trades > 0
    ? closedPositions.reduce((sum, p) => sum + (p.closed_at - p.opened_at), 0) / total_trades
    : 0

  res.json({
    farcaster_username: player.farcaster_username,
    farcaster_fid: player.farcaster_fid,
    display_name: player.display_name,
    pfp_url: player.pfp_url,
    cash: player.cash,
    high_score: player.high_score,
    created_at: player.created_at,
    total_trades,
    winning_trades,
    losing_trades,
    total_volume,
    biggest_win,
    biggest_loss,
    avg_hold_time,
    total_pnl
  })
})

// Submit cash to leaderboard
app.post('/api/player/:username/submit', (req, res) => {
  const username = req.params.username
  const { cash } = req.body

  // Get all players with submitted cash
  const allPlayers = db.prepare('SELECT farcaster_username, submitted_cash FROM players').all() as { farcaster_username: string, submitted_cash: number }[]

  // Calculate rank based on submitted cash
  const { rank, position } = calculateRank(cash, allPlayers)

  // Update player's submitted cash and rank
  db.prepare('UPDATE players SET submitted_cash = ?, rank = ?, updated_at = ? WHERE farcaster_username = ?').run(
    cash,
    rank,
    Date.now(),
    username
  )

  // Recalculate ranks for all players
  const updatedPlayers = db.prepare('SELECT farcaster_username, submitted_cash FROM players WHERE submitted_cash > 0').all() as { farcaster_username: string, submitted_cash: number }[]
  updatedPlayers.forEach((player) => {
    const { rank: newRank } = calculateRank(player.submitted_cash, updatedPlayers)
    db.prepare('UPDATE players SET rank = ? WHERE farcaster_username = ?').run(newRank, player.farcaster_username)
  })

  res.json({ success: true, rank, position })
})

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare('SELECT farcaster_username, display_name, pfp_url, submitted_cash as high_score, rank FROM players WHERE submitted_cash > 0 ORDER BY submitted_cash DESC LIMIT 100').all()
  res.json(leaderboard)
})

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('📡 Client connected')

  // Send current price immediately
  ws.send(JSON.stringify({
    price: priceEngine.getCurrentPrice(),
    history: priceEngine.getPriceHistory(120),
    timestamp: Date.now()
  }))

  ws.on('close', () => {
    console.log('📡 Client disconnected')
  })
})

const PORT = process.env.PORT || 3002

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket running on ws://localhost:${PORT}`)
})
