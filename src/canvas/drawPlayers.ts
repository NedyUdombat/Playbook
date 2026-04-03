import { Player, Stroke, ManCoverageLink } from '../types'
import { getLuminance } from '../utils/colorUtils'
import { getAdjustedStrokePoints } from '../utils/pathUtils'

export function drawPlayers(ctx: CanvasRenderingContext2D, players: Player[], w: number, h: number) {
  const r = Math.min(w, h) * 0.02762
  for (const p of players) {
    ctx.save()
    const isOffense = p.team === 'offense'
    const defaultColor = isOffense ? '#caff6f' : '#ff4757'
    const fillColor = p.color || defaultColor
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
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = fillColor
        ctx.fill()
        break
      case 'star': {
        const spikes = 5
        const outerRadius = r
        const innerRadius = r * 0.5
        ctx.beginPath()
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius
          const angle = (Math.PI / 2) + (i * Math.PI / spikes)
          const px = p.x + Math.cos(angle) * radius
          const py = p.y - Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
    }

    ctx.shadowBlur = 0
    ctx.fillStyle = textColor
    const fontSize = shape === 'x' ? r * 0.6 : r * 0.8
    ctx.font = `700 ${fontSize}px "Barlow Condensed", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const labelY = shape === 'triangle' ? p.y + r * 0.15 : p.y
    ctx.fillText(p.label.toUpperCase(), p.x, labelY)
    ctx.restore()
  }
}

export function drawManCoverageLinks(
  ctx: CanvasRenderingContext2D,
  players: Player[],
  links: ManCoverageLink[]
) {
  for (const link of links) {
    const defender = players.find(p => p.id === link.defenderId)
    const receiver = players.find(p => p.id === link.receiverId)
    if (!defender || !receiver) continue

    ctx.save()

    const mx = (defender.x + receiver.x) / 2
    const my = (defender.y + receiver.y) / 2
    const dx = receiver.x - defender.x
    const dy = receiver.y - defender.y
    const len = Math.sqrt(dx * dx + dy * dy)
    // Control point offset perpendicular to the line
    const offset = len * 0.25
    const nx = -dy / len
    const ny = dx / len
    const cpx = mx + nx * offset
    const cpy = my + ny * offset

    ctx.strokeStyle = '#a8d8ff'
    ctx.lineWidth = 1.8
    ctx.setLineDash([5, 4])
    ctx.lineCap = 'round'
    ctx.shadowColor = '#a8d8ff'
    ctx.shadowBlur = 4

    ctx.beginPath()
    ctx.moveTo(defender.x, defender.y)
    ctx.quadraticCurveTo(cpx, cpy, receiver.x, receiver.y)
    ctx.stroke()

    // "MAN" label at the midpoint of the curve (t=0.5)
    const lx = 0.25 * defender.x + 0.5 * cpx + 0.25 * receiver.x
    const ly = 0.25 * defender.y + 0.5 * cpy + 0.25 * receiver.y

    ctx.setLineDash([])
    ctx.shadowBlur = 0
    ctx.fillStyle = '#a8d8ff'
    ctx.font = '700 10px "Barlow Condensed", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('MAN', lx, ly)

    ctx.restore()
  }
}

export function drawSelectionHighlight(
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
