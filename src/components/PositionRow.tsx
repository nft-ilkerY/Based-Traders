import type { Position } from '../lib/gameState'

interface PositionRowProps {
  position: Position
  onClose: (id: string) => void
}

export default function PositionRow({ position, onClose }: PositionRowProps) {
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
    safe: 'border-l-gray-600',
    warning: 'border-l-yellow-500',
    danger: 'border-l-orange-500',
    critical: 'border-l-red-500',
  }[warningLevel]

  return (
    <div
      className={`bg-[#0a0c12] rounded-xl p-3 border-l-4 ${borderColor} ${
        warningLevel === 'critical' ? 'animate-pulse' : ''
      } grid grid-cols-6 md:grid-cols-8 gap-2 items-center`}
    >
      {/* Type & Leverage */}
      <div className="col-span-1">
        <span
          className={`text-sm md:text-base font-bold ${
            position.type === 'LONG' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {position.type}
        </span>
        <div className="text-xs text-gray-500">{position.leverage}x</div>
      </div>

      {/* Entry Price */}
      <div className="col-span-1 text-center">
        <div className="text-xs text-gray-500">Entry</div>
        <div className="text-sm font-mono">${position.entryPrice.toFixed(2)}</div>
      </div>

      {/* Current Price */}
      <div className="col-span-1 text-center">
        <div className="text-xs text-gray-500">Current</div>
        <div className="text-sm font-mono">${position.currentPrice.toFixed(2)}</div>
      </div>

      {/* Size */}
      <div className="col-span-1 text-center hidden md:block">
        <div className="text-xs text-gray-500">Size</div>
        <div className="text-sm font-mono">${position.size.toFixed(0)}</div>
      </div>

      {/* Liquidation */}
      <div className="col-span-1 text-center hidden md:block">
        <div className="text-xs text-gray-500">Liq Price</div>
        <div className="text-sm font-mono text-red-400">${position.liquidationPrice.toFixed(2)}</div>
      </div>

      {/* P&L */}
      <div className="col-span-2">
        <div
          className={`text-right ${
            position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
          }`}
        >
          <div className="text-base md:text-lg font-bold">
            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
          </div>
          <div className="text-xs">
            {position.pnlPercent >= 0 ? '+' : ''}
            {position.pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div className="col-span-1 text-right">
        {!position.isLiquidated ? (
          <button
            onClick={() => onClose(position.id)}
            className="bg-gray-700 hover:bg-gray-600 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-semibold transition-colors border border-gray-600"
          >
            Close
          </button>
        ) : (
          <span className="text-red-500 text-xs font-bold">LIQUIDATED</span>
        )}
      </div>
    </div>
  )
}
