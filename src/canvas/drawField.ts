import { getLineColor, getLuminance } from '../utils/colorUtils'
import { getFieldDimensions } from '../utils/fieldGeometry'

export function drawField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  firstDownYards: number = 10,
  fieldColor: string = '#091328',
  playName: string = ''
) {
  const dims = getFieldDimensions(w, h)
  const { bannerH, playNameH, headerH, endZoneH, endZoneEndY, fieldStartY, fieldH, losY, centerX } = dims
  const yardHeight = fieldH / 30

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

  // ── Background turf ──
  ctx.fillStyle = fieldColor
  ctx.fillRect(0, headerH, w, h - headerH)

  // Subtle alternating yard stripes (every 5 yards)
  const stripeCount = 6
  const stripeH = fieldH / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = lineColorVerySubtle
      ctx.fillRect(0, endZoneEndY + i * stripeH, w, stripeH)
    }
  }

  // End zone overlay
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

  // Goal line
  ctx.strokeStyle = lineColorStrong
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, endZoneEndY)
  ctx.lineTo(w, endZoneEndY)
  ctx.stroke()

  // Yard lines every 5 yards
  ctx.strokeStyle = lineColorSubtle
  ctx.lineWidth = 1
  for (let i = 5; i < 30; i += 5) {
    const y = endZoneEndY + yardHeight * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // Line of scrimmage (orange)
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, losY)
  ctx.lineTo(w, losY)
  ctx.stroke()

  // First down marker
  const firstDownY = losY - (firstDownYards * yardHeight)
  if (firstDownY > endZoneEndY) {
    ctx.strokeStyle = 'rgba(202, 255, 111, 0.92)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, firstDownY)
    ctx.lineTo(w, firstDownY)
    ctx.stroke()
  }

  // Pylons
  const pylonSize = w * 0.02
  const pylonRadius = pylonSize * 0.3
  ctx.fillStyle = '#ff6b35'
  ctx.strokeStyle = lineColorStrong
  ctx.lineWidth = 1.5

  const drawPylon = (px: number, py: number) => {
    ctx.beginPath()
    ctx.roundRect(px - pylonSize / 2, py - pylonSize / 2, pylonSize, pylonSize, pylonRadius)
    ctx.fill()
    ctx.stroke()
  }

  drawPylon(pylonSize / 2, endZoneEndY - pylonSize / 2)
  drawPylon(w - pylonSize / 2, endZoneEndY - pylonSize / 2)
  drawPylon(pylonSize / 2, fieldStartY + pylonSize / 2)
  drawPylon(w - pylonSize / 2, fieldStartY + pylonSize / 2)

  // Center hash marks every yard
  ctx.strokeStyle = getLineColor(fieldColor, 0.4)
  ctx.lineWidth = 1
  const hashLen = w * 0.03
  for (let i = 0; i <= 30; i++) {
    const y = endZoneEndY + yardHeight * i
    ctx.beginPath()
    ctx.moveTo(centerX - hashLen / 2, y)
    ctx.lineTo(centerX + hashLen / 2, y)
    ctx.stroke()
  }

  // Midfield line at bottom
  ctx.strokeStyle = lineColorMedium
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, h - 2)
  ctx.lineTo(w, h - 2)
  ctx.stroke()
}
