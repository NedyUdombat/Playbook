import { Stroke, Player } from '../types'
import { getAdjustedStrokePoints, getPointOnPath, getTangentAngle } from '../utils/pathUtils'

export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], players: Player[]) {
  const mainStrokes = strokes.filter(s => !s.parentStrokeId)
  const branchStrokes = strokes.filter(s => s.parentStrokeId)

  for (const stroke of mainStrokes) {
    const points = getAdjustedStrokePoints(stroke, players)
    if (points.length < 2) continue
    drawSingleStroke(ctx, stroke, points, false)
  }

  for (const stroke of branchStrokes) {
    const parentStroke = strokes.find(s => s.id === stroke.parentStrokeId)
    let points = stroke.points

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

export function drawSingleStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, points: { x: number; y: number }[], isBranch: boolean) {
  ctx.save()
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (stroke.lineStyle === 'dashed' || isBranch) {
    ctx.setLineDash([stroke.width * 3, stroke.width * 2])
  }

  if (isBranch) {
    ctx.globalAlpha = 0.7
  }

  if (stroke.tool === 'arrow') {
    const start = points[0]
    const end = points[points.length - 1]
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    for (let i = 1; i < points.length - 1; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.setLineDash([])
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

  if (stroke.annotations && stroke.annotations.length > 0) {
    ctx.save()
    for (const annotation of stroke.annotations) {
      const pt = getPointOnPath(points, annotation.t)
      ctx.font = `700 ${Math.max(10, stroke.width * 3)}px "Barlow Condensed", sans-serif`
      const textWidth = ctx.measureText(annotation.label).width
      const padding = 4
      const bgW = textWidth + padding * 2
      const bgH = 14
      const labelX = pt.x
      const labelY = pt.y - 12

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
