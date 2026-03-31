export type Tool = 'draw' | 'arrow' | 'player' | 'erase' | 'note' | 'select' | 'zone'

export type PlayerTeam = 'offense' | 'defense'

export type PlayerShape = 'circle' | 'triangle' | 'x' | 'square' | 'star'

export interface Point {
  x: number
  y: number
}

export type LineStyle = 'solid' | 'dashed'

// Yardage annotation on a route
export interface RouteAnnotation {
  id: string
  t: number // Position along the route (0-1)
  label: string // e.g. "10 YDS"
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
  tool: 'draw' | 'arrow'
  lineStyle: LineStyle
  anchoredPlayerId?: string // If set, route moves with this player
  parentStrokeId?: string // If set, this is a branch route
  branchPointIndex?: number // Index on parent stroke where branch starts
  annotations?: RouteAnnotation[] // Yardage labels on the route
}

export interface Player {
  id: string
  x: number
  y: number
  team: PlayerTeam
  label: string
  number: number
  shape: PlayerShape
  color?: string // Optional custom color override
}

// Sticky note card
export interface StickyNote {
  id: string
  x: number
  y: number
  text: string
  color: string // yellow, blue, green, red, white
}

export interface Play {
  id: string
  name: string
  strokes: Stroke[]
  players: Player[]
  stickyNotes: StickyNote[]
  notes: string
  createdAt: number
  fieldColor?: string // Custom field background color
  formation?: string
  situation?: string
}

export const MAX_PLAYS = 3
export const STORAGE_KEY = 'playbook_proto_plays'
