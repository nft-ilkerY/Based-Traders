import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './db.js'
import { calculateRank } from './rankSystem.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// CORS - only for development
const isDev = process.env.NODE_ENV !== 'production'
if (isDev) {
  app.use(cors())
}

app.use(express.json())

// Global Price Engine (Server-side)
class GlobalPriceEngine {
  private price: number
  private volatility: number = 0.004
  private trend: number = 0
  private trendChangeCounter: number = 0
  private consecutiveBullish: number = 0
  private consecutiveBearish: number = 0
  private smallMoveProbability: number = 0.03
  private mediumMoveProbability: number = 0.008
  private bigMoveProbability: number = 0.0005
  private crashProbability: number = 0.0008
  private pumpProbability: number = 0.0008
  private intervalId: NodeJS.Timeout | null = null
  private startTime: number = Date.now()

  private minPrice: number = 50
  private maxPrice: number = 600
  private absoluteMinPrice: number = 40
  private absoluteMaxPrice: number = 700

  constructor() {
    const lastPrice = db.prepare('SELECT price FROM price_history ORDER BY timestamp DESC LIMIT 1').get() as { price: number } | undefined
    this.price = lastPrice?.price || 100
    this.trend = -0.0002
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
    const elapsedMinutes = (Date.now() - this.startTime) / 1000 / 60

    let boundaryPressure = 0
    if (this.price < this.minPrice) {
      const distanceBelow = this.minPrice - this.price
      boundaryPressure = Math.min(distanceBelow * 0.002, 0.001)
    } else if (this.price > this.maxPrice) {
      const distanceAbove = this.price - this.maxPrice
      boundaryPressure = -Math.min(distanceAbove * 0.002, 0.001)
    }

    let baseTrend = boundaryPressure
    if (elapsedMinutes < 5) {
      baseTrend += -0.0002
    } else if (elapsedMinutes < 10) {
      baseTrend += 0
    } else {
      const bullishStrength = Math.min((elapsedMinutes - 10) / 30, 1)
      baseTrend += 0.0001 + (bullishStrength * 0.0002)
    }

    this.trendChangeCounter++
    if (this.trendChangeCounter > 60 + Math.random() * 120) {
      const randomTrend = (Math.random() - 0.5) * 0.0002
      let newTrend = baseTrend + randomTrend

      const isBullish = newTrend > 0
      const isBearish = newTrend < 0

      if (isBullish) {
        this.consecutiveBullish++
        this.consecutiveBearish = 0
      } else if (isBearish) {
        this.consecutiveBearish++
        this.consecutiveBullish = 0
      }

      if (this.consecutiveBullish >= 2 && Math.random() > 0.3) {
        newTrend = -Math.abs(newTrend) - 0.0001
        this.consecutiveBullish = 0
        this.consecutiveBearish = 1
      } else if (this.consecutiveBearish >= 2 && Math.random() > 0.3) {
        newTrend = Math.abs(newTrend) + 0.0001
        this.consecutiveBearish = 0
        this.consecutiveBullish = 1
      }

      this.trend = newTrend
      this.trendChangeCounter = 0
    }

    const crashChance = elapsedMinutes < 5 ? this.crashProbability * 0.3 : this.crashProbability
    const pumpChance = elapsedMinutes > 10 ? this.pumpProbability * 1.5 : this.pumpProbability

    if (Math.random() < crashChance) {
      const dropPercent = 0.02 + Math.random() * 0.03
      this.price = this.price * (1 - dropPercent)
    } else if (Math.random() < pumpChance) {
      const risePercent = 0.02 + Math.random() * 0.03
      this.price = this.price * (1 + risePercent)
    } else if (elapsedMinutes > 20 && Math.random() < this.bigMoveProbability) {
      const amount = 30 + Math.random() * 50
      const direction = Math.random() > 0.5 ? 1 : -1
      this.price = this.price + (amount * direction)
    } else if (Math.random() < this.mediumMoveProbability) {
      const amount = 5 + Math.random() * 10
      const direction = Math.random() > 0.5 ? 1 : -1
      this.price = this.price + (amount * direction)
    } else if (Math.random() < this.smallMoveProbability) {
      const amount = 1 + Math.random() * 3
      const direction = Math.random() > 0.5 ? 1 : -1
      this.price = this.price + (amount * direction)
    } else {
      const randomComponent = (Math.random() - 0.5) * 2 * this.volatility
      const change = this.trend + randomComponent
      this.price = this.price * (1 + change)
    }

    this.price = Math.max(this.absoluteMinPrice, Math.min(this.absoluteMaxPrice, this.price))

    this.savePrice()
    this.broadcastPrice()
  }

  private savePrice() {
    db.prepare('INSERT INTO price_history (price, timestamp) VALUES (?, ?)').run(
      this.price,
      Date.now()
    )

    const count = db.prepare('SELECT COUNT(*) as count FROM price_history').get() as { count: number }
    if (count.count > 300) {
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
      if (client.readyState === 1) {
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

app.get('/api/player/:username', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE farcaster_username = ?').get(req.params.username)
  if (!player) {
    return res.json(null)
  }
  res.json(player)
})

app.post('/api/player/create', (req, res) => {
  const { username, fid, displayName, pfpUrl } = req.body

  const existing = db.prepare('SELECT * FROM players WHERE farcaster_username = ?').get(username)

  if (existing) {
    db.prepare('UPDATE players SET farcaster_fid = ?, display_name = ?, pfp_url = ?, updated_at = ? WHERE farcaster_username = ?').run(
      fid,
      displayName,
      pfpUrl,
      Date.now(),
      username
    )
    return res.json(existing)
  }

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

app.get('/api/positions/:username/closed', (req, res) => {
  const positions = db.prepare('SELECT * FROM positions WHERE player_username = ? AND closed_at IS NOT NULL ORDER BY closed_at DESC').all(req.params.username)
  res.json(positions)
})

app.get('/api/player/:username/stats', (req, res) => {
  const username = req.params.username
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

  const closedPositions = db.prepare('SELECT * FROM positions WHERE player_username = ? AND closed_at IS NOT NULL').all(username) as any[]
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

app.post('/api/player/:username/submit', (req, res) => {
  const username = req.params.username
  const { cash } = req.body

  const allPlayers = db.prepare('SELECT farcaster_username, submitted_cash FROM players').all() as { farcaster_username: string, submitted_cash: number }[]
  const { rank, position } = calculateRank(cash, allPlayers)

  db.prepare('UPDATE players SET submitted_cash = ?, rank = ?, updated_at = ? WHERE farcaster_username = ?').run(
    cash,
    rank,
    Date.now(),
    username
  )

  const updatedPlayers = db.prepare('SELECT farcaster_username, submitted_cash FROM players WHERE submitted_cash > 0').all() as { farcaster_username: string, submitted_cash: number }[]
  updatedPlayers.forEach((player) => {
    const { rank: newRank } = calculateRank(player.submitted_cash, updatedPlayers)
    db.prepare('UPDATE players SET rank = ? WHERE farcaster_username = ?').run(newRank, player.farcaster_username)
  })

  res.json({ success: true, rank, position })
})

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare('SELECT farcaster_username, display_name, pfp_url, submitted_cash as high_score, rank FROM players WHERE submitted_cash > 0 ORDER BY submitted_cash DESC LIMIT 100').all()
  res.json(leaderboard)
})

// Serve static files in production
if (!isDev) {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// WebSocket
wss.on('connection', (ws) => {
  console.log('📡 Client connected')
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
  console.log(`🌍 Mode: ${isDev ? 'Development' : 'Production'}`)
})
