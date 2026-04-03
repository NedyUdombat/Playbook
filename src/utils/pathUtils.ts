import { Point, Stroke, Player } from '../types'

// Get adjusted stroke points based on anchored player offset
export function getAdjustedStrokePoints(stroke: Stroke, players: Player[]): Point[] {
  if (!stroke.anchoredPlayerId) return stroke.points
  const player = players.find(p => p.id === stroke.anchoredPlayerId)
  if (!player || stroke.points.length === 0) return stroke.points

  const originalAnchor = stroke.points[0]
  const offsetX = player.x - originalAnchor.x
  const offsetY = player.y - originalAnchor.y

  if (Math.abs(offsetX) < 0.1 && Math.abs(offsetY) < 0.1) return stroke.points

  return stroke.points.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY
  }))
}

// Get point along a path at parameter t (0-1)
export function getPointOnPath(points: Point[], t: number): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]

  let totalLen = 0
  const segments: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segments.push(len)
    totalLen += len
  }

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
export function getTangentAngle(points: Point[], t: number): number {
  const t1 = Math.max(0, t - 0.01)
  const t2 = Math.min(1, t + 0.01)
  const p1 = getPointOnPath(points, t1)
  const p2 = getPointOnPath(points, t2)
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

// Find closest point on a polyline path to a target, returns t (0-1), distance, and nearest point index
export function getClosestTOnPath(points: Point[], target: Point): { t: number; distance: number; closestPointIndex: number } {
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

// Convert mouse/touch event coordinates to canvas space
export function getCanvasPoint(canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent): Point {
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
