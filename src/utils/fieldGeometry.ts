// Returns the Y position of the line of scrimmage
// 7v7 flag football: half field is 30 yards, LOS ~10 yards up from bottom
export function getLOSY(fieldStartY: number, fieldH: number, h: number): number {
  const yardHeight = fieldH / 30 // 30 yards on half field
  return h - yardHeight * 10 // 10 yards up from bottom
}

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
