// Client-side Price Engine - Connects to WebSocket for global price
class PriceEngine {
  private price: number = 100
  private listeners: Set<(price: number) => void> = new Set()
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.connect()
  }

  private connect() {
    try {
      this.ws = new WebSocket('ws://localhost:3002')

      this.ws.onopen = () => {
        console.log('✅ Connected to price server')
      }

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.price = data.price
        this.notifyListeners()
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
      }

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from price server. Reconnecting...')
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000)
    }
  }

  start() {
    // WebSocket handles updates automatically
  }

  stop() {
    if (this.ws) {
      this.ws.close()
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
  }

  getCurrentPrice(): number {
    return this.price
  }

  subscribe(callback: (price: number) => void) {
    this.listeners.add(callback)
    // Immediately send current price
    callback(this.price)

    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.price))
  }
}

// Singleton instance
export const priceEngine = new PriceEngine()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    priceEngine.stop()
  })
}
