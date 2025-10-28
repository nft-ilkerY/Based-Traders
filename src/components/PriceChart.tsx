import { useState, useRef, type MouseEvent } from 'react'

interface PriceChartProps {
  data: number[]
}

export default function PriceChart({ data }: PriceChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; price: number; index: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const height = 300
  const width = 800

  if (data.length < 2) {
    return <div className="h-[300px] flex items-center justify-center text-gray-400">Loading chart...</div>
  }

  // Calculate min/max from actual data
  const dataMin = Math.min(...data)
  const dataMax = Math.max(...data)
  const dataRange = dataMax - dataMin

  // Add 10% padding to show all data comfortably
  const padding10Percent = Math.max(dataRange * 0.1, 2) // At least $2 padding
  const min = dataMin - padding10Percent
  const max = dataMax + padding10Percent
  const range = max - min

  // Add padding to prevent clipping
  const padding = 20
  const leftPadding = 10 // Small left padding

  // Generate SVG path with padding
  const points = data.map((price, index) => {
    const x = leftPadding + (index / (data.length - 1)) * (width - leftPadding * 2)
    const y = padding + ((max - price) / range) * (height - padding * 2)
    return { x, y, price, index }
  })

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`

  // Determine color based on first and last price
  const isPositive = data[data.length - 1] >= data[0]
  const strokeColor = isPositive ? '#10b981' : '#ef4444'
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'

  // Generate Y-axis labels (5 levels)
  const yAxisLevels = 5
  const yAxisLabels = Array.from({ length: yAxisLevels }, (_, i) => {
    const price = max - (range * i / (yAxisLevels - 1))
    const y = padding + ((max - price) / range) * (height - padding * 2)
    return { price, y }
  })

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width

    // Find closest point
    const closest = points.reduce((prev, curr) => {
      return Math.abs(curr.x - mouseX) < Math.abs(prev.x - mouseX) ? curr : prev
    })

    setHoveredPoint(closest)
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  return (
    <div className="w-full h-[300px] relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Y-axis grid lines and labels */}
        {yAxisLabels.map((label, i) => (
          <g key={i}>
            {/* Grid line */}
            <line
              x1={leftPadding}
              y1={label.y}
              x2={width - leftPadding}
              y2={label.y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {/* Price label background box (Binance style) */}
            <rect
              x={width - leftPadding - 75}
              y={label.y - 14}
              width="70"
              height="24"
              fill="rgba(30, 35, 45, 0.95)"
              rx="4"
            />
            {/* Price label text */}
            <text
              x={width - leftPadding - 40}
              y={label.y + 4}
              fill="rgba(255, 255, 255, 0.95)"
              fontSize="13"
              fontWeight="600"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
              letterSpacing="0.3"
            >
              ${label.price.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Fill area */}
        <path
          d={`${pathData} L ${width - leftPadding},${height - padding} L ${leftPadding},${height - padding} Z`}
          fill={fillColor}
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />

        {/* Hover indicator */}
        {hoveredPoint && (
          <>
            {/* Vertical line */}
            <line
              x1={hoveredPoint.x}
              y1={padding}
              x2={hoveredPoint.x}
              y2={height - padding}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {/* Horizontal line */}
            <line
              x1={leftPadding}
              y1={hoveredPoint.y}
              x2={width - leftPadding}
              y2={hoveredPoint.y}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {/* Point */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="5"
              fill={strokeColor}
              stroke="white"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {/* Tooltip background */}
            <rect
              x={hoveredPoint.x - 45}
              y={hoveredPoint.y - 35}
              width="90"
              height="25"
              fill="rgba(15, 17, 23, 0.95)"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
              rx="6"
            />
            {/* Tooltip text */}
            <text
              x={hoveredPoint.x}
              y={hoveredPoint.y - 18}
              fill="white"
              fontSize="14"
              fontWeight="500"
              fontFamily="Helvetica, Arial, sans-serif"
              textAnchor="middle"
              letterSpacing="1"
            >
              ${hoveredPoint.price.toFixed(2)}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
