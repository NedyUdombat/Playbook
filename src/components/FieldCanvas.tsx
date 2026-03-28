import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Point, Stroke, Player, Tool, PlayerTeam } from '../types'

interface FieldCanvasProps {
  strokes: Stroke[]
  players: Player[]
  tool: Tool
  color: string
  lineWidth: number
  onStrokeComplete: (stroke: Stroke) => void
  onPlayerPlace: (player: Player) => void
  onEraseStroke: (id: string) => void
  onErasePlayer: (id: string) => void
  playerTeam: PlayerTeam
  playerLabel: string
}

function drawField(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Background turf
  const turfGrad = ctx.createLinearGradient(0, 0, 0, h)
  turfGrad.addColorStop(0, '#1a3a1a')
  turfGrad.addColorStop(0.5, '#1f4020')
  turfGrad.addColorStop(1, '#1a3a1a')
  ctx.fillStyle = turfGrad
  ctx.fillRect(0, 0, w, h)

  // Alternating yard stripes (subtle)
  const endZoneW = w * 0.1
  const fieldW = w - endZoneW * 2
  const stripeCount = 10
  const stripeW = fieldW / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)'
      ctx.fillRect(endZoneW + i * stripeW, 0, stripeW, h)
    }
  }

  // End zones
  const ezLeft = ctx.createLinearGradient(0, 0, endZoneW, 0)
  ezLeft.addColorStop(0, '#0d2a5e')
  ezLeft.addColorStop(1, '#0f3270')
  ctx.fillStyle = ezLeft
  ctx.fillRect(0, 0, endZoneW, h)

  const ezRight = ctx.createLinearGradient(w - endZoneW, 0, w, 0)
  ezRight.addColorStop(0, '#0f3270')
  ezRight.addColorStop(1, '#0d2a5e')
  ctx.fillStyle = ezRight
  ctx.fillRect(w - endZoneW, 0, endZoneW, h)

  // End zone text
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.font = `bold ${h * 0.06}px "Barlow Condensed", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Left end zone - rotated
  ctx.save()
  ctx.translate(endZoneW / 2, h / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('END ZONE', 0, 0)
  ctx.restore()

  // Right end zone - rotated
  ctx.save()
  ctx.translate(w - endZoneW / 2, h / 2)
  ctx.rotate(Math.PI / 2)
  ctx.fillText('END ZONE', 0, 0)
  ctx.restore()
  ctx.restore()

  // Field boundary
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(endZoneW, 2, fieldW, h - 4)

  // Goal lines
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(endZoneW, 0)
  ctx.lineTo(endZoneW, h)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(w - endZoneW, 0)
  ctx.lineTo(w - endZoneW, h)
  ctx.stroke()

  // Yard lines (every 10 yards = fieldW/10)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1.5
  const yards = 10
  for (let i = 1; i < yards; i++) {
    const x = endZoneW + (fieldW / yards) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }

  // Hash marks (top and bottom thirds)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1.5
  const hashTop = h * 0.3
  const hashBot = h * 0.7
  const hashLen = h * 0.025
  const hashCount = yards * 5 // every 2 yards
  for (let i = 0; i <= hashCount; i++) {
    const x = endZoneW + (fieldW / hashCount) * i
    // Top hashes
    ctx.beginPath()
    ctx.moveTo(x, hashTop - hashLen / 2)
    ctx.lineTo(x, hashTop + hashLen / 2)
    ctx.stroke()
    // Bottom hashes
    ctx.beginPath()
    ctx.moveTo(x, hashBot - hashLen / 2)
    ctx.lineTo(x, hashBot + hashLen / 2)
    ctx.stroke()
  }

  // Midfield line (50 yard)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.stroke()
  ctx.setLineDash([])

  // Yard numbers
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = `600 ${h * 0.042}px "Barlow Condensed", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const yardNums = [10, 20, 30, 40, 50, 40, 30, 20, 10]
  for (let i = 0; i < yardNums.length; i++) {
    const x = endZoneW + (fieldW / yards) * (i + 0.5)
    ctx.fillText(String(yardNums[i]), x, h * 0.12)
    ctx.fillText(String(yardNums[i]), x, h * 0.88)
  }
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.save()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = stroke.color
    ctx.shadowBlur = 4

    if (stroke.tool === 'arrow') {
      const start = stroke.points[0]
      const end = stroke.points[stroke.points.length - 1]
      // Draw line
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      // Draw through intermediate points
      for (let i = 1; i < stroke.points.length - 1; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      // Arrowhead
      const prev = stroke.points[stroke.points.length - 2] || start
      const angle = Math.atan2(end.y - prev.y, end.x - prev.x)
      const headLen = Math.max(12, stroke.width * 4)
      ctx.fillStyle = stroke.color
      ctx.beginPath()
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1]
        const curr = stroke.points[i]
        const mx = (prev.x + curr.x) / 2
        const my = (prev.y + curr.y) / 2
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
      }
      ctx.lineTo(
        stroke.points[stroke.points.length - 1].x,
        stroke.points[stroke.points.length - 1].y
      )
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawPlayers(ctx: CanvasRenderingContext2D, players: Player[], w: number, h: number) {
  const r = Math.min(w, h) * 0.022
  for (const p of players) {
    ctx.save()
    const isOffense = p.team === 'offense'
    // Shadow
    ctx.shadowColor = isOffense ? '#e8ff47' : '#ff4757'
    ctx.shadowBlur = 10

    if (isOffense) {
      // Filled circle
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#e8ff47'
      ctx.fill()
      ctx.strokeStyle = '#0a0c0f'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      // Square for defense
      ctx.fillStyle = '#ff4757'
      ctx.strokeStyle = '#0a0c0f'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(p.x - r, p.y - r, r * 2, r * 2)
      ctx.fill()
      ctx.stroke()
    }

    // Label
    ctx.shadowBlur = 0
    ctx.fillStyle = isOffense ? '#0a0c0f' : '#fff'
    ctx.font = `700 ${r * 0.9}px "Barlow Condensed", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.label, p.x, p.y)
    ctx.restore()
  }
}

function getCanvasPoint(canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent): Point {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  if ('touches' in e) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    }
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  strokes,
  players,
  tool,
  color,
  lineWidth,
  onStrokeComplete,
  onPlayerPlace,
  onEraseStroke,
  onErasePlayer,
  playerTeam,
  playerLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const currentPoints = useRef<Point[]>([])
  const [size, setSize] = useState({ w: 800, h: 400 })

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ w: Math.floor(width), h: Math.floor(height) })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = size.w
    canvas.height = size.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawField(ctx, size.w, size.h)
    drawStrokes(ctx, strokes)
    drawPlayers(ctx, players, size.w, size.h)
  }, [strokes, players, size])

  const redrawWithCurrent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawField(ctx, canvas.width, canvas.height)
    drawStrokes(ctx, strokes)
    drawPlayers(ctx, players, canvas.width, canvas.height)
    // Draw current in-progress stroke
    if (currentPoints.current.length > 1) {
      const tempStroke: Stroke = {
        id: 'temp',
        points: currentPoints.current,
        color,
        width: lineWidth,
        tool: tool === 'arrow' ? 'arrow' : 'draw',
      }
      drawStrokes(ctx, [tempStroke])
    }
  }, [strokes, players, color, lineWidth, tool])

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const pt = getCanvasPoint(canvas, e)

      if (tool === 'erase') {
        // Check players first
        const playerR = Math.min(canvas.width, canvas.height) * 0.022
        for (const p of players) {
          const dx = p.x - pt.x
          const dy = p.y - pt.y
          if (Math.sqrt(dx * dx + dy * dy) < playerR * 1.5) {
            onErasePlayer(p.id)
            return
          }
        }
        // Check strokes - find nearest within threshold
        for (const stroke of [...strokes].reverse()) {
          for (const sp of stroke.points) {
            const dx = sp.x - pt.x
            const dy = sp.y - pt.y
            if (Math.sqrt(dx * dx + dy * dy) < 16) {
              onEraseStroke(stroke.id)
              return
            }
          }
        }
        return
      }

      if (tool === 'player') {
        const id = `player_${Date.now()}`
        onPlayerPlace({
          id,
          x: pt.x,
          y: pt.y,
          team: playerTeam,
          label: playerLabel,
          number: players.length + 1,
        })
        return
      }

      drawing.current = true
      currentPoints.current = [pt]
    },
    [tool, players, strokes, onErasePlayer, onEraseStroke, onPlayerPlace, playerTeam, playerLabel]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()
      const pt = getCanvasPoint(canvas, e)
      currentPoints.current.push(pt)
      redrawWithCurrent()
    },
    [redrawWithCurrent]
  )

  const handleEnd = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false
    if (currentPoints.current.length < 2) {
      currentPoints.current = []
      return
    }
    const stroke: Stroke = {
      id: `stroke_${Date.now()}`,
      points: [...currentPoints.current],
      color,
      width: lineWidth,
      tool: tool === 'arrow' ? 'arrow' : 'draw',
    }
    currentPoints.current = []
    onStrokeComplete(stroke)
  }, [color, lineWidth, tool, onStrokeComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousedown', handleStart)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseup', handleEnd)
    canvas.addEventListener('mouseleave', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleEnd)
    return () => {
      canvas.removeEventListener('mousedown', handleStart)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleEnd)
      canvas.removeEventListener('mouseleave', handleEnd)
      canvas.removeEventListener('touchstart', handleStart)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleEnd)
    }
  }, [handleStart, handleMove, handleEnd])

  const getCursor = () => {
    if (tool === 'erase') return 'cell'
    if (tool === 'player') return 'crosshair'
    return 'crosshair'
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 8, overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: getCursor() }}
      />
    </div>
  )
}
