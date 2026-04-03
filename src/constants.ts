import { Play } from './types'

export const ROUTE_COLORS = [
  { label: 'Lime',   value: '#caff6f' },
  { label: 'White',  value: '#FFFFFF' },
  { label: 'Red',    value: '#ff4757' },
  { label: 'Orange', value: '#FF8C00' },
  { label: 'Yellow', value: '#FFE600' },
  { label: 'Green',  value: '#00D068' },
  { label: 'Blue',   value: '#3d9eff' },
  { label: 'Indigo', value: '#4B4DED' },
  { label: 'Violet', value: '#9B30FF' },
]

export const OFFENSE_ROSTER = ['QB', 'WR', 'WR', 'WR', 'WR', 'C', 'RB']
export const DEFENSE_ROSTER = ['LB', 'CB', 'S', 'RSH']

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function newPlay(name: string): Play {
  return { id: generateId(), name, strokes: [], players: [], stickyNotes: [], zones: [], notes: '', createdAt: Date.now(), formation: '', situation: '' }
}
