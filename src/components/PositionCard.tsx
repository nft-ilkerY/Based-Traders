import type { Position } from '../lib/gameState'

interface PositionCardProps {
  position: Position
  onClose: (id: string) => void
}

export default function PositionCard({ position, onClose }: PositionCardProps) {
  const liquidationDistance = Math.abs(
    ((position.currentPrice - position.liquidationPrice) / position.currentPrice) * 100
  )

  const getWarningLevel = () => {
    if (liquidationDistance > 50) return 'safe'
    if (liquidationDistance > 20) return 'warning'
    if (liquidationDistance > 5) return 'danger'
    return 'critical'
  }

  const warningLevel = getWarningLevel()

  const borderColor = {
    safe: 'border-gray-600',
    warning: 'border-yellow-500',
    danger: 'border-orange-500',
    critical: 'border-red-500',
  }[warningLevel]

  const warningMessage = {
    safe: '',
    warning: '⚠️ Watch position',
    danger: '🚨 Near liquidation!',
    critical: '💀 LIQUIDATION IMMINENT!',
  }[warningLevel]

  return (
    <div
      className={`bg-gray-700 rounded-lg p-4 border-2 ${borderColor} ${
        warningLevel === 'critical' ? 'animate-pulse' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span
            className={`text-lg font-bold ${
              position.type === 'LONG' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {position.type} {position.leverage}x
          </span>
        </div>
        {!position.isLiquidated && (
          <button
            onClick={() => onClose(position.id)}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-semibold transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-1 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Entry:</span>
          <span className="font-mono">${position.entryPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Current:</span>
          <span className="font-mono">${position.currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Liquidation:</span>
          <span className="font-mono text-red-400">
            ${position.liquidationPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Size:</span>
          <span className="font-mono">${position.size.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Collateral:</span>
          <span className="font-mono">${position.collateral.toFixed(2)}</span>
        </div>
      </div>

      {/* P&L */}
      <div
        className={`text-center py-3 rounded-lg ${
          position.pnl >= 0 ? 'bg-green-900 bg-opacity-50' : 'bg-red-900 bg-opacity-50'
        }`}
      >
        <div
          className={`text-xl font-bold ${
            position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
        </div>
        <div className="text-sm">
          {position.pnlPercent >= 0 ? '+' : ''}
          {position.pnlPercent.toFixed(2)}%
        </div>
      </div>

      {/* Warning */}
      {warningMessage && (
        <div className="mt-2 text-center text-sm font-bold text-yellow-400">
          {warningMessage}
        </div>
      )}

      {/* Liquidation Status */}
      {position.isLiquidated && (
        <div className="mt-2 bg-red-500 text-white text-center py-2 rounded font-bold">
          💀 LIQUIDATED
        </div>
      )}
    </div>
  )
}
