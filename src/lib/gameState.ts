export interface Position {
  id: string
  type: 'LONG' | 'SHORT'
  entryPrice: number
  currentPrice: number
  leverage: number
  size: number // Position size in USD
  collateral: number // Initial margin
  pnl: number // Profit/Loss
  pnlPercent: number
  liquidationPrice: number
  isLiquidated: boolean
  openedAt: number
  token: string // Token symbol (e.g., "BATR")
  lastFundingUpdate: number // Timestamp of last funding fee charge
}

export interface PlayerState {
  address: string
  cash: number
  positions: Position[]
  totalValue: number
  pnl: number
  pnlPercent: number
}

const INITIAL_CASH = 1000
const BASE_TRADING_FEE = 0.002 // 0.2% base fee
const PROFIT_FEE = 0.05 // 5% fee on profit only
const API_BASE = 'http://localhost:3002/api'
const MAX_POSITION_SIZE_PERCENT = 0.80 // 80% max of total portfolio
const FUNDING_RATE_PER_HOUR = 0.0005 // 0.05% per hour
const FUNDING_UPDATE_INTERVAL = 3600000 // 1 hour in milliseconds

// Progressive fee rates based on balance
const getFeeRate = (totalValue: number): number => {
  if (totalValue >= 10000) return 0.005 // 0.5% for $10k+
  if (totalValue >= 5000) return 0.003 // 0.3% for $5k+
  return BASE_TRADING_FEE // 0.2% base
}

// Store player states in memory
const playerStates = new Map<string, PlayerState>()

export class GameState {
  private listeners: Set<(state: PlayerState) => void> = new Set()

  // Initialize player or get existing state
  async initPlayer(address: string): Promise<PlayerState> {
    if (!playerStates.has(address)) {
      // Fetch from database
      try {
        const response = await fetch(`${API_BASE}/player/${address}`)
        const data = await response.json()

        const initialState: PlayerState = {
          address,
          cash: data.cash || INITIAL_CASH,
          positions: [],
          totalValue: data.cash || INITIAL_CASH,
          pnl: 0,
          pnlPercent: 0,
        }
        playerStates.set(address, initialState)
        return initialState
      } catch (error) {
        console.error('Failed to fetch player data:', error)
        // Fallback to local state
        const initialState: PlayerState = {
          address,
          cash: INITIAL_CASH,
          positions: [],
          totalValue: INITIAL_CASH,
          pnl: 0,
          pnlPercent: 0,
        }
        playerStates.set(address, initialState)
        return initialState
      }
    }
    return playerStates.get(address)!
  }

  getPlayerState(address: string): PlayerState | undefined {
    return playerStates.get(address)
  }

  async openPosition(
    address: string,
    amount: number,
    leverage: number,
    type: 'LONG' | 'SHORT',
    currentPrice: number,
    token: string = 'BATR' // Default token for now
  ): Promise<{ success: boolean; error?: string }> {
    const state = playerStates.get(address)
    if (!state) {
      return { success: false, error: 'Player not initialized' }
    }

    // Check if already have position for this token
    const existingTokenPosition = state.positions.find(p => p.token === token && !p.isLiquidated)
    if (existingTokenPosition) {
      return { success: false, error: `Already have open position for ${token}` }
    }

    if (amount > state.cash) {
      return { success: false, error: 'Insufficient funds' }
    }

    // Check max collateral usage (80% of total portfolio)
    const maxCollateral = state.totalValue * MAX_POSITION_SIZE_PERCENT

    if (amount > maxCollateral) {
      return {
        success: false,
        error: `Max collateral allowed: $${maxCollateral.toFixed(2)} (80% of portfolio)`
      }
    }

    // Calculate progressive fee based on current balance
    const feeRate = getFeeRate(state.totalValue)
    const tradingFee = amount * feeRate
    const amountAfterFee = amount - tradingFee
    const size = amountAfterFee * leverage
    const liquidationDistance = 1 / leverage

    const liquidationPrice =
      type === 'LONG'
        ? currentPrice * (1 - liquidationDistance)
        : currentPrice * (1 + liquidationDistance)

    const position: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entryPrice: currentPrice,
      currentPrice,
      leverage,
      size,
      collateral: amountAfterFee, // Use amount after fee
      pnl: 0,
      pnlPercent: 0,
      liquidationPrice,
      isLiquidated: false,
      openedAt: Date.now(),
      token,
      lastFundingUpdate: Date.now(),
    }

    state.cash -= amount // Deduct full amount including fee
    state.positions.push(position)

    this.updateTotalValue(state, currentPrice)
    this.notifyListeners(state)

    // Save to database
    try {
      await fetch(`${API_BASE}/position/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: position.id,
          player_address: address,
          type: position.type,
          entry_price: position.entryPrice,
          leverage: position.leverage,
          size: position.size,
          collateral: position.collateral,
        }),
      })

      // Update player cash in database
      await fetch(`${API_BASE}/player/${address}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: state.cash,
          high_score: state.totalValue > INITIAL_CASH ? state.totalValue : INITIAL_CASH,
        }),
      })
    } catch (error) {
      console.error('Failed to save position to database:', error)
    }

    return { success: true }
  }

  async closePosition(address: string, positionId: string): Promise<{ success: boolean; error?: string }> {
    const state = playerStates.get(address)
    if (!state) {
      return { success: false, error: 'Player not initialized' }
    }

    const position = state.positions.find(p => p.id === positionId)
    if (!position) {
      return { success: false, error: 'Position not found' }
    }

    if (position.isLiquidated) {
      return { success: false, error: 'Position already liquidated' }
    }

    // Calculate closing fee (progressive based on balance)
    const feeRate = getFeeRate(state.totalValue)
    const closingFee = position.collateral * feeRate

    // Calculate fee - only on profit (5% profit fee)
    let finalPnl = position.pnl
    if (position.pnl > 0) {
      const profitFee = position.pnl * PROFIT_FEE
      finalPnl = position.pnl - profitFee
    }

    // Deduct closing fee from final return
    const totalReturn = position.collateral + finalPnl - closingFee

    // Return collateral + PNL (after fees) to cash
    state.cash += totalReturn

    // Remove position
    state.positions = state.positions.filter(p => p.id !== positionId)

    this.updateTotalValue(state, position.currentPrice)
    this.notifyListeners(state)

    // Save to database
    try {
      await fetch(`${API_BASE}/position/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: position.id,
          close_price: position.currentPrice,
          pnl: finalPnl,
          is_liquidated: false,
        }),
      })

      // Update player cash and high score
      await fetch(`${API_BASE}/player/${address}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: state.cash,
          high_score: Math.max(state.totalValue, state.totalValue > INITIAL_CASH ? state.totalValue : INITIAL_CASH),
        }),
      })
    } catch (error) {
      console.error('Failed to save position close to database:', error)
    }

    return { success: true }
  }

  updatePrices(address: string, currentPrice: number) {
    const state = playerStates.get(address)
    if (!state) return

    const now = Date.now()

    // Update all positions
    state.positions = state.positions.map(position => {
      const priceChange = currentPrice - position.entryPrice
      const priceChangePercent = priceChange / position.entryPrice

      // Calculate PNL based on position type
      let pnl: number
      if (position.type === 'LONG') {
        pnl = position.size * priceChangePercent
      } else {
        pnl = position.size * -priceChangePercent
      }

      // Apply funding rate (hourly fee on position size)
      const timeSinceLastFunding = now - position.lastFundingUpdate
      if (timeSinceLastFunding >= FUNDING_UPDATE_INTERVAL) {
        const hoursElapsed = Math.floor(timeSinceLastFunding / FUNDING_UPDATE_INTERVAL)
        const fundingFee = position.size * FUNDING_RATE_PER_HOUR * hoursElapsed
        pnl -= fundingFee // Deduct funding fee from PNL

        // Update last funding time
        position.lastFundingUpdate = now
      }

      const pnlPercent = (pnl / position.collateral) * 100

      // Check liquidation
      const isLiquidated =
        position.type === 'LONG'
          ? currentPrice <= position.liquidationPrice
          : currentPrice >= position.liquidationPrice

      if (isLiquidated && !position.isLiquidated) {
        // Position just got liquidated
        return {
          ...position,
          currentPrice,
          pnl: -position.collateral, // Lost all collateral
          pnlPercent: -100,
          isLiquidated: true,
        }
      }

      return {
        ...position,
        currentPrice,
        pnl,
        pnlPercent,
      }
    })

    // Remove liquidated positions after a delay (for UI notification)
    const liquidatedPositions = state.positions.filter(p => p.isLiquidated)
    if (liquidatedPositions.length > 0) {
      // Save liquidated positions to database
      liquidatedPositions.forEach(async (position) => {
        try {
          await fetch(`${API_BASE}/position/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: position.id,
              close_price: position.currentPrice,
              pnl: -position.collateral,
              is_liquidated: true,
            }),
          })

          // Update player cash in database
          await fetch(`${API_BASE}/player/${address}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cash: state.cash,
              high_score: Math.max(state.totalValue, INITIAL_CASH),
            }),
          })
        } catch (error) {
          console.error('Failed to save liquidated position to database:', error)
        }
      })

      setTimeout(() => {
        const currentState = playerStates.get(address)
        if (currentState) {
          currentState.positions = currentState.positions.filter(p => !p.isLiquidated)
          this.updateTotalValue(currentState, currentPrice)
          this.notifyListeners(currentState)
        }
      }, 3000) // Remove after 3 seconds
    }

    this.updateTotalValue(state, currentPrice)
    this.notifyListeners(state)
  }

  private updateTotalValue(state: PlayerState, currentPrice: number) {
    const positionsValue = state.positions
      .filter(p => !p.isLiquidated)
      .reduce((sum, p) => sum + p.collateral + p.pnl, 0)

    state.totalValue = state.cash + positionsValue
    state.pnl = state.totalValue - INITIAL_CASH
    state.pnlPercent = (state.pnl / INITIAL_CASH) * 100
  }

  subscribe(callback: (state: PlayerState) => void) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(state: PlayerState) {
    this.listeners.forEach(callback => callback(state))
  }
}

export const gameState = new GameState()
