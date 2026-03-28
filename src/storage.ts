import { Play, STORAGE_KEY } from './types'

export function loadPlays(): Play[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePlays(plays: Play[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays))
}
