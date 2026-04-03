import { Play, STORAGE_KEY } from './types'

export function loadPlays(): Play[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const plays: Play[] = JSON.parse(raw)
    // Migrate older saves that lack zones
    return plays.map((p) => ({ ...p, zones: p.zones ?? [] }))
  } catch {
    return []
  }
}

export function savePlays(plays: Play[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays))
}
