import { StickyNote, Point } from '../types'

export const STICKY_COLORS: Record<string, { bg: string; text: string }> = {
  yellow: { bg: '#ffeb3b', text: '#1a1a1a' },
  blue: { bg: '#42a5f5', text: '#1a1a1a' },
  green: { bg: '#66bb6a', text: '#1a1a1a' },
  red: { bg: '#ef5350', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#1a1a1a' },
}

export function drawStickyNotes(ctx: CanvasRenderingContext2D, notes: StickyNote[], w: number, h: number) {
  const noteW = w * 0.18
  const noteH = noteW * 0.7
  const cornerRadius = 4
  const padding = 6

  for (const note of notes) {
    const colors = STICKY_COLORS[note.color] || STICKY_COLORS.yellow
    const x = note.x - noteW / 2
    const y = note.y - noteH / 2

    ctx.save()

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2

    ctx.fillStyle = colors.bg
    ctx.beginPath()
    ctx.roundRect(x, y, noteW, noteH, cornerRadius)
    ctx.fill()

    ctx.shadowColor = 'transparent'

    ctx.fillStyle = colors.text
    ctx.font = `700 ${Math.max(9, noteW * 0.1)}px "Barlow Condensed", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

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

    // Delete button (×) in top-right corner
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

export function getNoteDeleteBtnCenter(note: StickyNote, canvasW: number): { cx: number; cy: number; r: number } {
  const noteW = canvasW * 0.18
  const x = note.x - noteW / 2
  const y = note.y - noteW * 0.7 / 2
  const r = noteW * 0.05
  return { cx: x + noteW - r * 1.2, cy: y + r * 1.2, r }
}

export function hitTestNote(note: StickyNote, pt: Point, canvasW: number): boolean {
  const noteW = canvasW * 0.18
  const noteH = noteW * 0.7
  return (
    pt.x >= note.x - noteW / 2 &&
    pt.x <= note.x + noteW / 2 &&
    pt.y >= note.y - noteH / 2 &&
    pt.y <= note.y + noteH / 2
  )
}
