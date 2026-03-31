import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Point, Stroke, Player, Tool, PlayerTeam, LineStyle, PlayerShape, StickyNote, RouteAnnotation } from '../types'

interface FieldCanvasProps {
  strokes: Stroke[]
  players: Player[]
  stickyNotes: StickyNote[]
  tool: Tool
  color: string
  lineWidth: number
  lineStyle: LineStyle
  onStrokeComplete: (stroke: Stroke) => void
  onPlayerPlace: (player: Player) => void
  onEraseStroke: (id: string) => void
  onErasePlayer: (id: string) => void
  onSnapMarkerPlace: (player: Player) => void
  onPlayerClick?: (playerId: string, screenX: number, screenY: number) => void
  onPlayerMove?: (playerId: string, x: number, y: number) => void
  onStickyNotePlace?: (note: StickyNote) => void
  onStickyNoteMove?: (noteId: string, x: number, y: number) => void
  onStickyNoteUpdate?: (noteId: string, updates: Partial<StickyNote>) => void
  onStickyNoteDelete?: (noteId: string) => void
  onStrokeUpdate?: (strokeId: string, updates: Partial<Stroke>) => void
  onRouteDoubleClick?: (strokeId: string, t: number, screenX: number, screenY: number) => void
  playerTeam: PlayerTeam
  playerLabel: string
  playerShape: PlayerShape
  firstDownYards: number
  fieldColor?: string
  playName?: string
  noteColor?: string
}

// Returns the Y position of the line of scrimmage
// 7v7 flag football: half field is 30 yards, LOS ~10 yards up from bottom
function getLOSY(fieldStartY: number, fieldH: number, h: number): number {
  const yardHeight = fieldH / 30 // 30 yards on half field
  return h - yardHeight * 10 // 10 yards up from bottom
}

// Calculate luminance of a hex color (0-1)
function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)
  if (!rgb) return 0.5
  const [r, g, b] = rgb.map(c => {
    const v = parseInt(c, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Get contrasting line color based on background
function getLineColor(bgColor: string, alpha: number = 1): string {
  const lum = getLuminance(bgColor)
  const baseColor = lum > 0.5 ? '0,0,0' : '255,255,255'
  return `rgba(${baseColor},${alpha})`
}

// Export for external use (snap marker placement)
export function getFieldDimensions(w: number, h: number) {
  const bannerH = 0
  const playNameH = 0
  const headerH = bannerH + playNameH
  // Total field: 30 yards playing field + 10 yard end zone = 40 yards
  // End zone should be 10/40 of remaining height
  const fieldAreaH = h - headerH
  const endZoneH = fieldAreaH * (10 / 40)
  const fieldStartY = headerH
  const endZoneEndY = fieldStartY + endZoneH
  const fieldH = fieldAreaH - endZoneH // Playing field area (35 yards)
  const losY = getLOSY(fieldStartY, fieldH, h)
  return { bannerH, playNameH, headerH, endZoneH, endZoneEndY, fieldStartY, fieldH, losY, centerX: w / 2 }
}

function drawField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  firstDownYards: number = 10,
  fieldColor: string = '#091328',
  playName: string = ''
) {
  // 7v7 Flag Football Field - Portrait orientation
  // Half field shown: 30 yards (end zone to midfield)
  // Top = play name, then end zone (10 yards), bottom = midfield
  // LOS is ~10 yards up from the bottom

  const dims = getFieldDimensions(w, h)
  const { bannerH, playNameH, headerH, endZoneH, endZoneEndY, fieldStartY, fieldH, losY, centerX } = dims
  const yardHeight = fieldH / 30 // Height per yard

  // Get line colors based on field background luminance
  const lineColorStrong = getLineColor(fieldColor, 0.5)
  const lineColorMedium = getLineColor(fieldColor, 0.3)
  const lineColorSubtle = getLineColor(fieldColor, 0.15)
  const lineColorVerySubtle = getLineColor(fieldColor, 0.05)

  // ── Play name sub-header ──
  ctx.fillStyle = '#222'
  ctx.fillRect(0, bannerH, w, playNameH)
  if (playName) {
    ctx.fillStyle = '#e8ff47'
    ctx.font = `700 ${playNameH * 0.6}px "Barlow Condensed", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(playName.toUpperCase(), centerX, bannerH + playNameH / 2)
  }

  // ── Background turf - use custom field color ──
  ctx.fillStyle = fieldColor
  ctx.fillRect(0, headerH, w, h - headerH)

  // Subtle alternating yard stripes (every 5 yards for cleaner look)
  const stripeCount = 6 // 6 stripes of 5 yards each (30 yards)
  const stripeH = fieldH / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = lineColorVerySubtle
      ctx.fillRect(0, endZoneEndY + i * stripeH, w, stripeH)
    }
  }

  // End zone at top — accent-tinted overlay
  ctx.fillStyle = 'rgba(202, 255, 111, 0.04)'
  ctx.fillRect(0, fieldStartY, w, endZoneH)

  // End zone text
  ctx.save()
  ctx.fillStyle = 'rgba(202, 255, 111, 0.12)'
  ctx.font = `900 ${endZoneH * 0.55}px "Barlow Condensed", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BLITZ', centerX, fieldStartY + endZoneH / 2)
  ctx.restore()

  // Goal line (top of field area)
  ctx.strokeStyle = lineColorStrong
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, endZoneEndY)
  ctx.lineTo(w, endZoneEndY)
  ctx.stroke()

  // Yard lines every 5 yards - subtle
  ctx.strokeStyle = lineColorSubtle
  ctx.lineWidth = 1
  for (let i = 5; i < 30; i += 5) {
    const y = endZoneEndY + yardHeight * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // Line of scrimmage (bold blue)
  ctx.strokeStyle = 'rgba(61, 158, 255, 0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, losY)
  ctx.lineTo(w, losY)
  ctx.stroke()

  // First down marker — NFL broadcast yellow
  const firstDownY = losY - (firstDownYards * yardHeight)
  if (firstDownY > endZoneEndY) {
    ctx.strokeStyle = 'rgba(252, 213, 0, 0.92)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, firstDownY)
    ctx.lineTo(w, firstDownY)
    ctx.stroke()
  }

  // Pylons - orange rounded squares in each corner of the end zone (flush with edges)
  const pylonSize = w * 0.02
  const pylonRadius = pylonSize * 0.3
  ctx.fillStyle = '#ff6b35'
  ctx.strokeStyle = lineColorStrong
  ctx.lineWidth = 1.5

  // Helper to draw rounded rect
  const drawPylon = (px: number, py: number) => {
    ctx.beginPath()
    ctx.roundRect(px - pylonSize / 2, py - pylonSize / 2, pylonSize, pylonSize, pylonRadius)
    ctx.fill()
    ctx.stroke()
  }

  // Goal line pylons (at endZoneEndY)
  drawPylon(pylonSize / 2, endZoneEndY - pylonSize / 2)
  drawPylon(w - pylonSize / 2, endZoneEndY - pylonSize / 2)
  // Back of end zone pylons
  drawPylon(pylonSize / 2, fieldStartY + pylonSize / 2)
  drawPylon(w - pylonSize / 2, fieldStartY + pylonSize / 2)

  // Single center hash mark (7v7 style) - one hash in the middle
  ctx.strokeStyle = getLineColor(fieldColor, 0.4)
  ctx.lineWidth = 1
  const hashLen = w * 0.03
  // Hash marks every yard along the center
  for (let i = 0; i <= 30; i++) {
    const y = endZoneEndY + yardHeight * i
    ctx.beginPath()
    ctx.moveTo(centerX - hashLen / 2, y)
    ctx.lineTo(centerX + hashLen / 2, y)
    ctx.stroke()
  }

  // Midfield line at bottom (subtle)
  ctx.strokeStyle = lineColorMedium
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, h - 2)
  ctx.lineTo(w, h - 2)
  ctx.stroke()
}

// Get adjusted stroke points based on anchored player offset
function getAdjustedStrokePoints(stroke: Stroke, players: Player[]): Point[] {
  if (!stroke.anchoredPlayerId) return stroke.points
  const player = players.find(p => p.id === stroke.anchoredPlayerId)
  if (!player || stroke.points.length === 0) return stroke.points

  // Calculate offset from original anchor point to current player position
  const originalAnchor = stroke.points[0]
  const offsetX = player.x - originalAnchor.x
  const offsetY = player.y - originalAnchor.y

  // If player hasn't moved, return original points
  if (Math.abs(offsetX) < 0.1 && Math.abs(offsetY) < 0.1) return stroke.points

  // Apply offset to all points
  return stroke.points.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY
  }))
}

// Get point along a path at parameter t (0-1)
function getPointOnPath(points: Point[], t: number): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]

  // Calculate total length
  let totalLen = 0
  const segments: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segments.push(len)
    totalLen += len
  }

  // Find point at t
  const targetLen = t * totalLen
  let accLen = 0
  for (let i = 0; i < segments.length; i++) {
    if (accLen + segments[i] >= targetLen) {
      const segT = (targetLen - accLen) / segments[i]
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segT,
        y: points[i].y + (points[i + 1].y - points[i].y) * segT
      }
    }
    accLen += segments[i]
  }
  return points[points.length - 1]
}

// Get tangent angle at point t on path
function getTangentAngle(points: Point[], t: number): number {
  const t1 = Math.max(0, t - 0.01)
  const t2 = Math.min(1, t + 0.01)
  const p1 = getPointOnPath(points, t1)
  const p2 = getPointOnPath(points, t2)
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

// Find closest point on a polyline path to a target, returns t (0-1), distance, and nearest point index
function getClosestTOnPath(points: Point[], target: Point): { t: number; distance: number; closestPointIndex: number } {
  if (points.length < 2) return { t: 0, distance: Infinity, closestPointIndex: 0 }
  let totalLen = 0
  const segments: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segments.push(len)
    totalLen += len
  }
  if (totalLen === 0) return { t: 0, distance: Infinity, closestPointIndex: 0 }
  let bestT = 0
  let bestDist = Infinity
  let bestPointIndex = 0
  let accLen = 0
  for (let i = 0; i < segments.length; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const segLen = segments[i]
    if (segLen === 0) { accLen += segLen; continue }
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const segT = Math.max(0, Math.min(1, ((target.x - p1.x) * dx + (target.y - p1.y) * dy) / (segLen * segLen)))
    const cx = p1.x + segT * dx
    const cy = p1.y + segT * dy
    const dist = Math.sqrt((target.x - cx) ** 2 + (target.y - cy) ** 2)
    if (dist < bestDist) {
      bestDist = dist
      bestT = (accLen + segT * segLen) / totalLen
      bestPointIndex = segT < 0.5 ? i : i + 1
    }
    accLen += segLen
  }
  return { t: bestT, distance: bestDist, closestPointIndex: bestPointIndex }
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], players: Player[]) {
  // Separate branch strokes from main strokes
  const mainStrokes = strokes.filter(s => !s.parentStrokeId)
  const branchStrokes = strokes.filter(s => s.parentStrokeId)

  // Draw main strokes
  for (const stroke of mainStrokes) {
    const points = getAdjustedStrokePoints(stroke, players)
    if (points.length < 2) continue
    drawSingleStroke(ctx, stroke, points, false)
  }

  // Draw branch strokes (with dashed style and lower opacity)
  for (const stroke of branchStrokes) {
    const parentStroke = strokes.find(s => s.id === stroke.parentStrokeId)
    let points = stroke.points

    // If parent exists, offset branch based on parent's anchor
    if (parentStroke) {
      const parentPoints = getAdjustedStrokePoints(parentStroke, players)
      if (parentPoints !== parentStroke.points && stroke.branchPointIndex !== undefined) {
        const originalParentStart = parentStroke.points[0]
        const adjustedParentStart = parentPoints[0]
        const offsetX = adjustedParentStart.x - originalParentStart.x
        const offsetY = adjustedParentStart.y - originalParentStart.y
        points = stroke.points.map(p => ({
          x: p.x + offsetX,
          y: p.y + offsetY
        }))
      }
    }

    if (points.length < 2) continue
    drawSingleStroke(ctx, stroke, points, true)
  }
}

function drawSingleStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, points: Point[], isBranch: boolean) {
  ctx.save()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Apply dashed line style if needed (branch routes are always dashed)
  if (stroke.lineStyle === 'dashed' || isBranch) {
    ctx.setLineDash([stroke.width * 3, stroke.width * 2])
  }

  // Branch routes have lower opacity
  if (isBranch) {
    ctx.globalAlpha = 0.7
  }

  if (stroke.tool === 'arrow') {
    const start = points[0]
    const end = points[points.length - 1]
    // Draw line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    // Draw through intermediate points
    for (let i = 1; i < points.length - 1; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    // Reset line dash for arrowhead
    ctx.setLineDash([])
    // Arrowhead
    const prev = points[points.length - 2] || start
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
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const mx = (prev.x + curr.x) / 2
      const my = (prev.y + curr.y) / 2
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  }

  ctx.restore()

  // Draw annotations
  if (stroke.annotations && stroke.annotations.length > 0) {
    ctx.save()
    for (const annotation of stroke.annotations) {
      const pt = getPointOnPath(points, annotation.t)
      const angle = getTangentAngle(points, annotation.t)

      // Draw label background
      ctx.font = `700 ${Math.max(10, stroke.width * 3)}px "Barlow Condensed", sans-serif`
      const textWidth = ctx.measureText(annotation.label).width
      const padding = 4
      const bgW = textWidth + padding * 2
      const bgH = 14

      // Position above the line
      const offsetY = -12
      const labelX = pt.x
      const labelY = pt.y + offsetY

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.beginPath()
      ctx.roundRect(labelX - bgW / 2, labelY - bgH / 2, bgW, bgH, 3)
      ctx.fill()

      ctx.fillStyle = stroke.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(annotation.label, labelX, labelY)
    }
    ctx.restore()
  }
}

// Sticky note colors
const STICKY_COLORS: Record<string, { bg: string; text: string }> = {
  yellow: { bg: '#ffeb3b', text: '#1a1a1a' },
  blue: { bg: '#42a5f5', text: '#1a1a1a' },
  green: { bg: '#66bb6a', text: '#1a1a1a' },
  red: { bg: '#ef5350', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#1a1a1a' },
}

function drawStickyNotes(ctx: CanvasRenderingContext2D, notes: StickyNote[], w: number, h: number) {
  const noteW = w * 0.18
  const noteH = noteW * 0.7
  const cornerRadius = 4
  const padding = 6

  for (const note of notes) {
    const colors = STICKY_COLORS[note.color] || STICKY_COLORS.yellow
    const x = note.x - noteW / 2
    const y = note.y - noteH / 2

    ctx.save()

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2

    // Background
    ctx.fillStyle = colors.bg
    ctx.beginPath()
    ctx.roundRect(x, y, noteW, noteH, cornerRadius)
    ctx.fill()

    // Remove shadow for text
    ctx.shadowColor = 'transparent'

    // Text
    ctx.fillStyle = colors.text
    ctx.font = `700 ${Math.max(9, noteW * 0.1)}px "Barlow Condensed", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Word wrap text
    const maxWidth = noteW - padding * 2
    const lineHeight = Math.max(11, noteW * 0.12)
    const words = note.text.split(' ')
    let line = ''
    let yOffset = y + padding

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, x + padding, yOffset)
        line = word
        yOffset += lineHeight
        if (yOffset > y + noteH - padding - lineHeight) break
      } else {
        line = testLine
      }
    }
    if (line && yOffset <= y + noteH - padding) {
      ctx.fillText(line, x + padding, yOffset)
    }

    // Delete button (×) in top-right corner — small, no background circle
    const btnR = noteW * 0.05
    const btnCX = x + noteW - btnR * 1.2
    const btnCY = y + btnR * 1.2
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.font = `700 ${Math.round(btnR * 1.8)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('×', btnCX, btnCY)

    ctx.restore()
  }
}

function getNoteDeleteBtnCenter(note: StickyNote, canvasW: number): { cx: number; cy: number; r: number } {
  const noteW = canvasW * 0.18
  const x = note.x - noteW / 2
  const y = note.y - noteW * 0.7 / 2
  const r = noteW * 0.05
  return { cx: x + noteW - r * 1.2, cy: y + r * 1.2, r }
}

function hitTestNote(note: StickyNote, pt: Point, canvasW: number): boolean {
  const noteW = canvasW * 0.18
  const noteH = noteW * 0.7
  return (
    pt.x >= note.x - noteW / 2 &&
    pt.x <= note.x + noteW / 2 &&
    pt.y >= note.y - noteH / 2 &&
    pt.y <= note.y + noteH / 2
  )
}

function drawPlayers(ctx: CanvasRenderingContext2D, players: Player[], w: number, h: number) {
  const r = Math.min(w, h) * 0.02762
  for (const p of players) {
    ctx.save()
    const isOffense = p.team === 'offense'
    const defaultColor = isOffense ? '#caff6f' : '#ff4757'
    const fillColor = p.color || defaultColor
    // Determine text color based on fill brightness
    const textColor = getLuminance(fillColor) > 0.35 ? '#0a0c0f' : '#fff'
    const shape = p.shape || 'circle'

    ctx.fillStyle = fillColor
    ctx.strokeStyle = '#0a0c0f'
    ctx.lineWidth = 1.5

    switch (shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        break
      case 'square':
        ctx.beginPath()
        ctx.roundRect(p.x - r, p.y - r, r * 2, r * 2, r * 0.16)
        ctx.fill()
        ctx.stroke()
        break
      case 'triangle':
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - r)
        ctx.lineTo(p.x + r, p.y + r * 0.8)
        ctx.lineTo(p.x - r, p.y + r * 0.8)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      case 'x':
        ctx.lineWidth = 3
        ctx.strokeStyle = fillColor
        ctx.beginPath()
        ctx.moveTo(p.x - r * 0.7, p.y - r * 0.7)
        ctx.lineTo(p.x + r * 0.7, p.y + r * 0.7)
        ctx.moveTo(p.x + r * 0.7, p.y - r * 0.7)
        ctx.lineTo(p.x - r * 0.7, p.y + r * 0.7)
        ctx.stroke()
        // Draw a small backing circle for label visibility
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = fillColor
        ctx.fill()
        break
      case 'star':
        const spikes = 5
        const outerRadius = r
        const innerRadius = r * 0.5
        ctx.beginPath()
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const angle = (Math.PI / 2) + (i * Math.PI / spikes)
          const px = p.x + Math.cos(angle) * radius
          const py = p.y - Math.sin(angle) * radius
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
    }

    // Label - draw small text on top
    ctx.shadowBlur = 0
    ctx.fillStyle = textColor
    const fontSize = shape === 'x' ? r * 0.6 : r * 0.8
    ctx.font = `700 ${fontSize}px "Barlow Condensed", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // For triangle, offset label slightly down
    const labelY = shape === 'triangle' ? p.y + r * 0.15 : p.y
    ctx.fillText(p.label.toUpperCase(), p.x, labelY)
    ctx.restore()
  }
}

function drawSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  selected: { id: string; type: 'player' | 'stroke' },
  strokes: Stroke[],
  players: Player[],
  w: number,
  h: number
) {
  ctx.save()
  if (selected.type === 'player') {
    const p = players.find(pl => pl.id === selected.id)
    if (!p) { ctx.restore(); return }
    const r = Math.min(w, h) * 0.02762
    const pad = 5
    const shape = p.shape || 'circle'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 12
    ctx.setLineDash([5, 3])
    ctx.beginPath()
    switch (shape) {
      case 'circle':
        ctx.arc(p.x, p.y, r + pad, 0, Math.PI * 2)
        break
      case 'square':
        ctx.roundRect(p.x - r - pad, p.y - r - pad, (r + pad) * 2, (r + pad) * 2, r * 0.16)
        break
      case 'triangle': {
        const tp = pad * 1.3
        ctx.moveTo(p.x, p.y - r - tp)
        ctx.lineTo(p.x + r + tp, p.y + r * 0.8 + tp)
        ctx.lineTo(p.x - r - tp, p.y + r * 0.8 + tp)
        ctx.closePath()
        break
      }
      case 'x':
        ctx.arc(p.x, p.y, r + pad, 0, Math.PI * 2)
        break
      case 'star': {
        const outerR = r + pad
        const innerR = r * 0.5 + pad * 0.3
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerR : innerR
          const angle = (Math.PI / 2) + (i * Math.PI / 5)
          const sx = p.x + Math.cos(angle) * radius
          const sy = p.y - Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.closePath()
        break
      }
    }
    ctx.stroke()
  } else {
    const stroke = strokes.find(s => s.id === selected.id)
    if (!stroke) { ctx.restore(); return }
    const points = getAdjustedStrokePoints(stroke, players)
    if (points.length < 2) { ctx.restore(); return }
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = stroke.width + 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 14
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  }
  ctx.restore()
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
  stickyNotes = [],
  tool,
  color,
  lineWidth,
  lineStyle,
  onStrokeComplete,
  onPlayerPlace,
  onEraseStroke,
  onErasePlayer,
  onSnapMarkerPlace,
  onPlayerClick,
  onPlayerMove,
  onStickyNotePlace,
  onStickyNoteMove,
  onStickyNoteUpdate,
  onStickyNoteDelete,
  onStrokeUpdate,
  playerTeam,
  playerLabel,
  playerShape,
  firstDownYards,
  noteColor = 'yellow',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const currentPoints = useRef<Point[]>([])
  const [size, setSize] = useState({ w: 300, h: 700 })
  const [isDragOver, setIsDragOver] = useState(false)
  const draggingPlayer = useRef<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number; isSelectMode?: boolean } | null>(null)
  const dragMoved = useRef(false)
  const anchorPlayerId = useRef<string | null>(null)
  const branchFromStroke = useRef<{ strokeId: string; pointIndex: number; startPt: Point } | null>(null)
  const lastClickTime = useRef(0)
  const lastClickPos = useRef<Point>({ x: 0, y: 0 })
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'player' | 'stroke' } | null>(null)
  const [annotationInput, setAnnotationInput] = useState<{ strokeId: string; t: number; x: number; y: number } | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  const draggingNote = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(null)
  const [noteEditor, setNoteEditor] = useState<{
    id: string | null
    canvasX: number
    canvasY: number
    screenX: number
    screenY: number
    text: string
    color: string
  } | null>(null)

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

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (tool !== 'select') setSelectedItem(null)
  }, [tool])

  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = size.w
    canvas.height = size.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawField(ctx, size.w, size.h, firstDownYards)
    drawStrokes(ctx, strokes, players)
    drawPlayers(ctx, players, size.w, size.h)
    drawStickyNotes(ctx, stickyNotes, size.w, size.h)
    if (selectedItem) drawSelectionHighlight(ctx, selectedItem, strokes, players, size.w, size.h)
  }, [strokes, players, stickyNotes, size, firstDownYards, selectedItem])

  const redrawWithCurrent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawField(ctx, canvas.width, canvas.height, firstDownYards)
    drawStrokes(ctx, strokes, players)
    drawPlayers(ctx, players, canvas.width, canvas.height)
    drawStickyNotes(ctx, stickyNotes, canvas.width, canvas.height)
    if (selectedItem) drawSelectionHighlight(ctx, selectedItem, strokes, players, canvas.width, canvas.height)
    // Draw current in-progress stroke
    if (currentPoints.current.length > 1) {
      const tempStroke: Stroke = {
        id: 'temp',
        points: currentPoints.current,
        color,
        width: lineWidth,
        tool: tool === 'arrow' ? 'arrow' : 'draw',
        lineStyle,
      }
      drawStrokes(ctx, [tempStroke], players)
    }
  }, [strokes, players, stickyNotes, color, lineWidth, tool, lineStyle, firstDownYards, selectedItem])

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const pt = getCanvasPoint(canvas, e)

      // Track click timing for double-click detection (annotation)
      const now = Date.now()
      const isDoubleClick =
        now - lastClickTime.current < 300 &&
        Math.sqrt((pt.x - lastClickPos.current.x) ** 2 + (pt.y - lastClickPos.current.y) ** 2) < 20
      lastClickTime.current = now
      lastClickPos.current = pt

      // Check note delete buttons first (before drag check)
      for (const note of [...stickyNotes].reverse()) {
        const btn = getNoteDeleteBtnCenter(note, canvas.width)
        const dx = pt.x - btn.cx
        const dy = pt.y - btn.cy
        if (Math.sqrt(dx * dx + dy * dy) <= btn.r * 1.2) {
          onStickyNoteDelete?.(note.id)
          return
        }
      }

      // Hit-test notes — draggable regardless of active tool
      for (const note of [...stickyNotes].reverse()) {
        if (hitTestNote(note, pt, canvas.width)) {
          draggingNote.current = { id: note.id, offsetX: pt.x - note.x, offsetY: pt.y - note.y, moved: false }
          return
        }
      }

      if (tool === 'note') {
        // Click on empty space → open editor for new note
        const rect2 = canvas.getBoundingClientRect()
        const sx2 = rect2.width / canvas.width
        const sy2 = rect2.height / canvas.height
        setNoteEditor({ id: null, canvasX: pt.x, canvasY: pt.y, screenX: pt.x * sx2, screenY: pt.y * sy2, text: '', color: noteColor })
        return
      }

      if (tool === 'erase') {
        // Check sticky notes first
        for (const note of [...stickyNotes].reverse()) {
          if (hitTestNote(note, pt, canvas.width)) {
            onStickyNoteDelete?.(note.id)
            return
          }
        }
        // Check players first
        const playerR = Math.min(canvas.width, canvas.height) * 0.03249
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

      if (tool === 'select') {
        const playerR = Math.min(canvas.width, canvas.height) * 0.03249
        // Hit-test players first
        for (const p of players) {
          const dx = p.x - pt.x
          const dy = p.y - pt.y
          if (Math.sqrt(dx * dx + dy * dy) < playerR * 1.4) {
            setSelectedItem({ id: p.id, type: 'player' })
            draggingPlayer.current = {
              id: p.id,
              startX: p.x,
              startY: p.y,
              offsetX: pt.x - p.x,
              offsetY: pt.y - p.y,
              isSelectMode: true,
            }
            dragMoved.current = false
            return
          }
        }
        // Hit-test strokes
        for (const stroke of [...strokes].reverse()) {
          const points = getAdjustedStrokePoints(stroke, players)
          for (const sp of points) {
            const dx = sp.x - pt.x
            const dy = sp.y - pt.y
            if (Math.sqrt(dx * dx + dy * dy) < 14) {
              setSelectedItem({ id: stroke.id, type: 'stroke' })
              return
            }
          }
        }
        // Clicked empty space — clear selection
        setSelectedItem(null)
        return
      }

      // Check if clicking on an existing player
      const playerR = Math.min(canvas.width, canvas.height) * 0.03249
      for (const p of players) {
        const dx = p.x - pt.x
        const dy = p.y - pt.y
        if (Math.sqrt(dx * dx + dy * dy) < playerR * 1.2) {
          if (tool === 'draw' || tool === 'arrow') {
            // Start an anchored route from this player's exact position
            anchorPlayerId.current = p.id
            drawing.current = true
            currentPoints.current = [{ x: p.x, y: p.y }]
          } else {
            // Drag the player (all other tools)
            draggingPlayer.current = {
              id: p.id,
              startX: p.x,
              startY: p.y,
              offsetX: pt.x - p.x,
              offsetY: pt.y - p.y,
            }
            dragMoved.current = false
          }
          return
        }
      }

      if (tool === 'player') {
        // Players are added via drag and drop only
        return
      }

      if (tool === 'draw' || tool === 'arrow') {
        const STROKE_HIT = 14

        // Double-click near existing stroke → annotation input
        if (isDoubleClick) {
          for (const stroke of [...strokes].reverse()) {
            const strokePoints = getAdjustedStrokePoints(stroke, players)
            if (strokePoints.length < 2) continue
            const { distance, t } = getClosestTOnPath(strokePoints, pt)
            if (distance < STROKE_HIT * 1.5) {
              const rect = canvas.getBoundingClientRect()
              const scaleX = rect.width / canvas.width
              const scaleY = rect.height / canvas.height
              setAnnotationInput({ strokeId: stroke.id, t, x: pt.x * scaleX, y: pt.y * scaleY })
              setAnnotationText('')
              return
            }
          }
        }

        // Single click near existing stroke → branch route
        for (const stroke of [...strokes].reverse()) {
          const strokePoints = getAdjustedStrokePoints(stroke, players)
          if (strokePoints.length < 2) continue
          const { distance, t, closestPointIndex } = getClosestTOnPath(strokePoints, pt)
          if (distance < STROKE_HIT) {
            const branchPt = getPointOnPath(strokePoints, t)
            branchFromStroke.current = { strokeId: stroke.id, pointIndex: closestPointIndex, startPt: branchPt }
            drawing.current = true
            currentPoints.current = [branchPt]
            return
          }
        }
      }

      drawing.current = true
      currentPoints.current = [pt]
    },
    [tool, players, strokes, stickyNotes, noteColor, onErasePlayer, onEraseStroke, onStickyNoteDelete, onPlayerPlace, playerTeam, playerLabel, playerShape]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()
      const pt = getCanvasPoint(canvas, e)

      // Handle note dragging
      if (draggingNote.current) {
        const newX = pt.x - draggingNote.current.offsetX
        const newY = pt.y - draggingNote.current.offsetY
        draggingNote.current.moved = true
        onStickyNoteMove?.(draggingNote.current.id, newX, newY)
        return
      }

      // Handle player dragging
      if (draggingPlayer.current) {
        const newX = pt.x - draggingPlayer.current.offsetX
        const newY = pt.y - draggingPlayer.current.offsetY
        const dx = newX - draggingPlayer.current.startX
        const dy = newY - draggingPlayer.current.startY
        if (Math.sqrt(dx * dx + dy * dy) > 3) {
          dragMoved.current = true
        }
        onPlayerMove?.(draggingPlayer.current.id, newX, newY)
        return
      }

      if (!drawing.current) return
      currentPoints.current.push(pt)
      redrawWithCurrent()
    },
    [redrawWithCurrent, onPlayerMove, onStickyNoteMove]
  )

  const confirmNoteEditor = useCallback(() => {
    if (!noteEditor) return
    const { id, canvasX, canvasY, text, color } = noteEditor
    if (id === null) {
      if (text.trim()) {
        onStickyNotePlace?.({ id: `note_${Date.now()}`, x: canvasX, y: canvasY, text: text.trim(), color })
      }
    } else {
      onStickyNoteUpdate?.(id, { text: text.trim(), color })
    }
    setNoteEditor(null)
  }, [noteEditor, onStickyNotePlace, onStickyNoteUpdate])

  const cancelNoteEditor = useCallback(() => setNoteEditor(null), [])

  const deleteNoteFromEditor = useCallback(() => {
    if (!noteEditor || noteEditor.id === null) return
    onStickyNoteDelete?.(noteEditor.id)
    setNoteEditor(null)
  }, [noteEditor, onStickyNoteDelete])

  const handleEnd = useCallback(
    (e?: MouseEvent | TouchEvent) => {
      // Handle note drag end
      if (draggingNote.current) {
        const { id, moved } = draggingNote.current
        draggingNote.current = null
        if (!moved && tool === 'note') {
          // Click (no drag) → open editor for this note
          const canvas = canvasRef.current
          const note = stickyNotes.find((n) => n.id === id)
          if (canvas && note) {
            const rect = canvas.getBoundingClientRect()
            const sx = rect.width / canvas.width
            const sy = rect.height / canvas.height
            setNoteEditor({ id: note.id, canvasX: note.x, canvasY: note.y, screenX: note.x * sx, screenY: note.y * sy, text: note.text, color: note.color })
          }
        }
        return
      }

      // Handle player drag end
      if (draggingPlayer.current) {
        const playerId = draggingPlayer.current.id
        const wasDragged = dragMoved.current
        const wasSelectMode = draggingPlayer.current.isSelectMode
        draggingPlayer.current = null
        dragMoved.current = false

        // If it was just a click (no movement), show context menu (not in select mode)
        if (!wasDragged && !wasSelectMode && onPlayerClick) {
          const canvas = canvasRef.current
          if (canvas) {
            const player = players.find((p) => p.id === playerId)
            if (player) {
              const rect = canvas.getBoundingClientRect()
              const scaleX = rect.width / canvas.width
              const scaleY = rect.height / canvas.height
              const screenX = rect.left + player.x * scaleX
              const screenY = rect.top + player.y * scaleY
              onPlayerClick(playerId, screenX, screenY)
            }
          }
        }
        return
      }

      if (!drawing.current) return
      drawing.current = false
      if (currentPoints.current.length < 2) {
        currentPoints.current = []
        anchorPlayerId.current = null
        return
      }
      const stroke: Stroke = {
        id: `stroke_${Date.now()}`,
        points: [...currentPoints.current],
        color,
        width: lineWidth,
        tool: tool === 'arrow' ? 'arrow' : 'draw',
        lineStyle,
        ...(anchorPlayerId.current ? { anchoredPlayerId: anchorPlayerId.current } : {}),
        ...(branchFromStroke.current
          ? { parentStrokeId: branchFromStroke.current.strokeId, branchPointIndex: branchFromStroke.current.pointIndex }
          : {}),
      }
      currentPoints.current = []
      anchorPlayerId.current = null
      branchFromStroke.current = null
      onStrokeComplete(stroke)
    },
    [color, lineWidth, tool, lineStyle, onStrokeComplete, onPlayerClick, players, stickyNotes]
  )

  const confirmAnnotation = useCallback(() => {
    if (!annotationInput || !annotationText.trim()) {
      setAnnotationInput(null)
      return
    }
    const stroke = strokes.find(s => s.id === annotationInput.strokeId)
    if (stroke) {
      const annotation: RouteAnnotation = {
        id: `ann_${Date.now()}`,
        t: annotationInput.t,
        label: annotationText.trim().toUpperCase(),
      }
      onStrokeUpdate?.(annotationInput.strokeId, {
        annotations: [...(stroke.annotations || []), annotation],
      })
    }
    setAnnotationInput(null)
    setAnnotationText('')
  }, [annotationInput, annotationText, strokes, onStrokeUpdate])

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
    if (tool === 'select') return 'default'
    if (tool === 'erase') return 'pointer'
    if (tool === 'player') return 'crosshair'
    if (tool === 'note') return 'crosshair'
    return 'crosshair'
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set drag over to false if we're leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const canvas = canvasRef.current
      if (!canvas) return

      const data = e.dataTransfer.getData('application/json')
      if (!data) return

      try {
        const playerData = JSON.parse(data) as { team: PlayerTeam; label: string; shape: PlayerShape }
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        const player: Player = {
          id: `player_${Date.now()}`,
          x,
          y,
          team: playerData.team,
          label: playerData.label,
          number: players.length + 1,
          shape: playerData.shape,
        }
        onPlayerPlace(player)
      } catch {
        // Invalid data, ignore
      }
    },
    [players.length, onPlayerPlace]
  )

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 0 5px rgba(255,255,255,0.5)', }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: getCursor() }}
      />
      {noteEditor && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={cancelNoteEditor} />
          <div
            style={{
              position: 'absolute',
              left: noteEditor.screenX,
              top: noteEditor.screenY,
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              background: 'rgba(10, 12, 15, 0.97)',
              border: '1px solid rgba(232, 255, 71, 0.35)',
              borderRadius: 6,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              minWidth: 170,
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={noteEditor.text}
              onChange={(e) => setNoteEditor((prev) => prev ? { ...prev, text: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmNoteEditor() }
                if (e.key === 'Escape') { e.stopPropagation(); cancelNoteEditor() }
              }}
              placeholder="3 STEP DROP..."
              rows={3}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: '"Barlow Condensed", sans-serif',
                padding: '4px 6px',
                width: '100%',
                resize: 'none',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {(['yellow', 'blue', 'green', 'red', 'white'] as const).map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => { e.preventDefault(); setNoteEditor((prev) => prev ? { ...prev, color: c } : null) }}
                  style={{
                    width: 20,
                    height: 20,
                    background: STICKY_COLORS[c].bg,
                    border: noteEditor.color === c ? '2px solid #e8ff47' : '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                  title={c}
                />
              ))}
              {noteEditor.id !== null && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); deleteNoteFromEditor() }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                  title="Delete note"
                >✕</button>
              )}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(232,255,71,0.4)', fontFamily: 'monospace' }}>↵ save · Esc cancel</div>
          </div>
        </div>
      )}
      {annotationInput && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: annotationInput.x,
              top: annotationInput.y,
              transform: 'translate(-50%, calc(-100% - 10px))',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <input
              autoFocus
              value={annotationText}
              onChange={e => setAnnotationText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAnnotation()
                if (e.key === 'Escape') { setAnnotationInput(null); setAnnotationText('') }
              }}
              onBlur={() => { setAnnotationInput(null); setAnnotationText('') }}
              placeholder="10 YDS"
              style={{
                background: 'rgba(10, 12, 15, 0.95)',
                border: '1px solid rgba(232, 255, 71, 0.7)',
                borderRadius: 4,
                color: '#e8ff47',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: '"Barlow Condensed", sans-serif',
                padding: '3px 8px',
                width: 80,
                outline: 'none',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            />
            <div style={{ fontSize: 10, color: 'rgba(232,255,71,0.5)', fontFamily: 'monospace' }}>↵ confirm</div>
          </div>
        </div>
      )}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '3px dashed #e8ff47',
            borderRadius: 8,
            backgroundColor: 'rgba(232, 255, 71, 0.1)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ color: '#e8ff47', fontWeight: 700, fontSize: 16 }}>DROP PLAYER HERE</div>
        </div>
      )}
    </div>
  )
}
