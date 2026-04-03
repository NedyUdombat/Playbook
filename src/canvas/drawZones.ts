import { Zone } from '../types'

function buildZonePath(ctx: CanvasRenderingContext2D, zone: Zone) {
  const x = Math.min(zone.x1, zone.x2)
  const y = Math.min(zone.y1, zone.y2)
  const w = Math.abs(zone.x2 - zone.x1)
  const h = Math.abs(zone.y2 - zone.y1)

  ctx.beginPath()
  if (zone.shape === 'rectangle') {
    ctx.rect(x, y, w, h)
  } else if (zone.shape === 'circle') {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  } else {
    // triangle: apex top-center, base bottom
    ctx.moveTo(x + w / 2, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.closePath()
  }
}

export function drawZones(ctx: CanvasRenderingContext2D, zones: Zone[]) {
  for (const zone of zones) {
    drawZone(ctx, zone)
  }
}

function drawZone(ctx: CanvasRenderingContext2D, zone: Zone) {
  const w = Math.abs(zone.x2 - zone.x1)
  const h = Math.abs(zone.y2 - zone.y1)
  if (w < 6 || h < 6) return

  const x = Math.min(zone.x1, zone.x2)
  const y = Math.min(zone.y1, zone.y2)

  ctx.save()

  // Clip to zone shape and draw hatching inside
  buildZonePath(ctx, zone)
  ctx.clip()

  ctx.strokeStyle = zone.color
  ctx.globalAlpha = 0.22
  ctx.lineWidth = 1
  ctx.setLineDash([])
  const spacing = 10
  const extent = Math.max(w, h) + spacing
  for (let i = -extent; i <= extent + w; i += spacing) {
    ctx.beginPath()
    ctx.moveTo(x + i, y)
    ctx.lineTo(x + i + h, y + h)
    ctx.stroke()
  }

  ctx.restore()

  // Dashed border (outside clip)
  ctx.save()
  buildZonePath(ctx, zone)
  ctx.strokeStyle = zone.color
  ctx.globalAlpha = 1
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 5])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}
