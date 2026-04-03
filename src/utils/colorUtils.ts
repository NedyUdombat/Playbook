// Calculate luminance of a hex color (0-1)
export function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)
  if (!rgb) return 0.5
  const [r, g, b] = rgb.map(c => {
    const v = parseInt(c, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Get contrasting line color based on background
export function getLineColor(bgColor: string, alpha: number = 1): string {
  const lum = getLuminance(bgColor)
  const baseColor = lum > 0.5 ? '0,0,0' : '255,255,255'
  return `rgba(${baseColor},${alpha})`
}
