import { useState } from 'react'

interface TradingControlsProps {
  currentPrice: number
  playerCash: number
  playerTotalValue: number
  onOpenPosition: (amount: number, leverage: number, type: 'LONG' | 'SHORT') => void
}

export default function TradingControls({
  currentPrice,
  playerCash,
  playerTotalValue,
  onOpenPosition,
}: TradingControlsProps) {
  const [amount, setAmount] = useState(100)
  const [leverage, setLeverage] = useState(5)

  // Calculate max collateral (80% of total portfolio)
  const maxCollateral = Math.min(playerCash, playerTotalValue * 0.80)
  const positionSize = amount * leverage

  const handleOpenPosition = (type: 'LONG' | 'SHORT') => {
    if (amount <= 0 || amount > maxCollateral) {
      alert(`Invalid amount. Max allowed: $${maxCollateral.toFixed(2)}`)
      return
    }

    onOpenPosition(amount, leverage, type)

    // Reset to minimum after opening position
    setAmount(10)
    setLeverage(5)
  }

  // Ensure amountPercent is clamped between 0 and 100
  const amountPercent = Math.max(0, Math.min(100, ((amount - 10) / Math.max(1, maxCollateral - 10)) * 100))

  return (
    <div className="space-y-4">
      {/* Amount Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-400">Position Amount</label>
          <span className="text-lg font-bold text-white">${amount.toFixed(2)}</span>
        </div>
        <div className="relative" style={{ marginTop: '-1px' }}>
          <div className="absolute w-full h-2 bg-gray-700 rounded-lg pointer-events-none">
            <div
              className="h-full bg-[#0000FF] rounded-lg transition-all duration-150"
              style={{ width: `${amountPercent}%` }}
            />
          </div>
          <input
            type="range"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={10}
            max={maxCollateral}
            step={10}
            className="relative w-full slider"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>$10</span>
          <span>Max: ${maxCollateral.toFixed(2)} (80%)</span>
        </div>
      </div>

      {/* Leverage Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-400">Leverage</label>
          <span className="text-lg font-bold text-white">{leverage}×</span>
        </div>
        <div className="relative" style={{ marginTop: '-1px' }}>
          <div className="absolute w-full h-2 bg-gray-700 rounded-lg pointer-events-none">
            <div
              className="h-full bg-[#0000FF] rounded-lg transition-all duration-150"
              style={{ width: `${((leverage - 1) / 9) * 100}%` }}
            />
          </div>
          <input
            type="range"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            min={1}
            max={10}
            step={1}
            className="relative w-full slider"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500" style={{ marginTop: '-2px' }}>
          <span>1×</span>
          <span>2×</span>
          <span>3×</span>
          <span>4×</span>
          <span>5×</span>
          <span>6×</span>
          <span>7×</span>
          <span>8×</span>
          <span>9×</span>
          <span>10×</span>
        </div>
      </div>

      {/* Position Details */}
      <div className="bg-[#0a0c12] rounded-xl p-4 space-y-2 text-sm border border-gray-800">
        <div className="flex justify-between">
          <span className="text-gray-400">Collateral:</span>
          <span className="font-semibold">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-800 pt-2">
          <span className="text-gray-400">Position Size:</span>
          <span className="font-bold text-lg">${positionSize.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Liquidation at:</span>
          <span className="font-semibold text-red-400">
            ±{(100 / leverage).toFixed(1)}% move
          </span>
        </div>
        <div className="flex justify-between text-gray-500 text-xs pt-2 border-t border-gray-800">
          <span>5% fee on profit only</span>
        </div>
      </div>

      {/* Long/Short Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => handleOpenPosition('LONG')}
          disabled={amount <= 0 || amount > playerCash}
          className="bg-green-500 hover:bg-green-600 disabled:bg-white disabled:bg-opacity-10 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition-all text-lg"
        >
          LONG 📈
        </button>
        <button
          onClick={() => handleOpenPosition('SHORT')}
          disabled={amount <= 0 || amount > playerCash}
          className="bg-red-500 hover:bg-red-600 disabled:bg-white disabled:bg-opacity-10 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition-all text-lg"
        >
          SHORT 📉
        </button>
      </div>
    </div>
  )
}
