export type Tool = 'draw' | 'arrow' | 'player' | 'erase'

export type PlayerTeam = 'offense' | 'defense'

export interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
  tool: 'draw' | 'arrow'
}

export interface Player {
  id: string
  x: number
  y: number
  team: PlayerTeam
  label: string
  number: number
}

export interface Play {
  id: string
  name: string
  strokes: Stroke[]
  players: Player[]
  createdAt: number
}

export const MAX_PLAYS = 3
export const STORAGE_KEY = 'playbook_proto_plays'
