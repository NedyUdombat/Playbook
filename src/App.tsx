import React, { useState, useRef, useCallback } from 'react'
import { Play, Stroke, Player, Tool, PlayerTeam, MAX_PLAYS } from './types'
import { loadPlays, savePlays } from './storage'
import { FieldCanvas } from './components/FieldCanvas'
import { exportPlayToPDF } from './utils/exportPDF'
import './App.css'

const ROUTE_COLORS = [
  { label: 'Lime', value: '#e8ff47' },
  { label: 'Red', value: '#ff4757' },
  { label: 'Blue', value: '#3d9eff' },
  { label: 'White', value: '#ffffff' },
  { label: 'Orange', value: '#ff8c42' },
  { label: 'Purple', value: '#c084fc' },
]

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function newPlay(name: string): Play {
  return { id: generateId(), name, strokes: [], players: [], createdAt: Date.now() }
}

export default function App() {
  const [plays, setPlays] = useState<Play[]>(() => loadPlays())
  const [activePlayId, setActivePlayId] = useState<string | null>(() => {
    const loaded = loadPlays()
    return loaded.length > 0 ? loaded[0].id : null
  })
  const [tool, setTool] = useState<Tool>('draw')
  const [color, setColor] = useState(ROUTE_COLORS[0].value)
  const [lineWidth, setLineWidth] = useState(3)
  const [playerTeam, setPlayerTeam] = useState<PlayerTeam>('offense')
  const [playerLabel, setPlayerLabel] = useState('QB')
  const [newPlayName, setNewPlayName] = useState('')
  const [showNewPlay, setShowNewPlay] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [undoStack, setUndoStack] = useState<{ strokes: Stroke[]; players: Player[] }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const activePlay = plays.find((p) => p.id === activePlayId) ?? null

  const persist = useCallback((updated: Play[]) => {
    setPlays(updated)
    savePlays(updated)
  }, [])

  const updateActivePlay = useCallback(
    (updater: (play: Play) => Play) => {
      setPlays((prev) => {
        const next = prev.map((p) => (p.id === activePlayId ? updater(p) : p))
        savePlays(next)
        return next
      })
    },
    [activePlayId]
  )

  const handleStrokeComplete = useCallback(
    (stroke: Stroke) => {
      if (!activePlay) return
      setUndoStack((s) => [...s.slice(-20), { strokes: activePlay.strokes, players: activePlay.players }])
      updateActivePlay((p) => ({ ...p, strokes: [...p.strokes, stroke] }))
    },
    [activePlay, updateActivePlay]
  )

  const handlePlayerPlace = useCallback(
    (player: Player) => {
      if (!activePlay) return
      setUndoStack((s) => [...s.slice(-20), { strokes: activePlay.strokes, players: activePlay.players }])
      updateActivePlay((p) => ({ ...p, players: [...p.players, player] }))
    },
    [activePlay, updateActivePlay]
  )

  const handleEraseStroke = useCallback(
    (id: string) => {
      if (!activePlay) return
      setUndoStack((s) => [...s.slice(-20), { strokes: activePlay.strokes, players: activePlay.players }])
      updateActivePlay((p) => ({ ...p, strokes: p.strokes.filter((s) => s.id !== id) }))
    },
    [activePlay, updateActivePlay]
  )

  const handleErasePlayer = useCallback(
    (id: string) => {
      if (!activePlay) return
      setUndoStack((s) => [...s.slice(-20), { strokes: activePlay.strokes, players: activePlay.players }])
      updateActivePlay((p) => ({ ...p, players: p.players.filter((pl) => pl.id !== id) }))
    },
    [activePlay, updateActivePlay]
  )

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !activePlay) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    updateActivePlay((p) => ({ ...p, strokes: prev.strokes, players: prev.players }))
  }, [undoStack, activePlay, updateActivePlay])

  const handleClear = useCallback(() => {
    if (!activePlay) return
    setUndoStack((s) => [...s.slice(-20), { strokes: activePlay.strokes, players: activePlay.players }])
    updateActivePlay((p) => ({ ...p, strokes: [], players: [] }))
  }, [activePlay, updateActivePlay])

  const handleCreatePlay = useCallback(() => {
    if (plays.length >= MAX_PLAYS) return
    const name = newPlayName.trim() || `Play ${plays.length + 1}`
    const play = newPlay(name)
    const updated = [...plays, play]
    persist(updated)
    setActivePlayId(play.id)
    setNewPlayName('')
    setShowNewPlay(false)
    setUndoStack([])
  }, [plays, newPlayName, persist])

  const handleDeletePlay = useCallback(
    (id: string) => {
      const updated = plays.filter((p) => p.id !== id)
      persist(updated)
      if (activePlayId === id) {
        setActivePlayId(updated.length > 0 ? updated[0].id : null)
      }
    },
    [plays, activePlayId, persist]
  )

  const handleExport = useCallback(async () => {
    if (!activePlay) return
    // Find the canvas element
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    setExporting(true)
    try {
      await exportPlayToPDF(canvas, activePlay)
    } finally {
      setExporting(false)
    }
  }, [activePlay])

  const handleSelectPlay = (id: string) => {
    setActivePlayId(id)
    setUndoStack([])
  }

  const slotsLeft = MAX_PLAYS - plays.length
  const canAddPlay = plays.length < MAX_PLAYS

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo-mark">▶</span>
          <div>
            <div className="logo-title">PLAYBOOK</div>
            <div className="logo-sub">PROTO</div>
          </div>
        </div>

        {/* Plays list */}
        <div className="plays-section">
          <div className="section-label">PLAYS <span className="slot-badge">{plays.length}/{MAX_PLAYS}</span></div>
          <div className="plays-list">
            {plays.length === 0 && (
              <div className="empty-plays">No plays yet.<br />Create your first play.</div>
            )}
            {plays.map((p) => (
              <div
                key={p.id}
                className={`play-item ${p.id === activePlayId ? 'active' : ''}`}
                onClick={() => handleSelectPlay(p.id)}
              >
                <span className="play-name">{p.name}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeletePlay(p.id) }}
                  title="Delete play"
                >✕</button>
              </div>
            ))}
          </div>

          {showNewPlay ? (
            <div className="new-play-form">
              <input
                className="play-name-input"
                placeholder="Play name..."
                value={newPlayName}
                onChange={(e) => setNewPlayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlay()}
                autoFocus
              />
              <div className="new-play-actions">
                <button className="btn-confirm" onClick={handleCreatePlay}>CREATE</button>
                <button className="btn-cancel" onClick={() => setShowNewPlay(false)}>CANCEL</button>
              </div>
            </div>
          ) : (
            <button
              className={`btn-new-play ${!canAddPlay ? 'disabled' : ''}`}
              onClick={() => canAddPlay && setShowNewPlay(true)}
              disabled={!canAddPlay}
            >
              {canAddPlay ? `+ NEW PLAY (${slotsLeft} left)` : '✓ MAX PLAYS REACHED'}
            </button>
          )}
        </div>

        {/* Tools */}
        {activePlay && (
          <>
            <div className="divider" />
            <div className="tools-section">
              <div className="section-label">TOOL</div>
              <div className="tool-grid">
                {([
                  { id: 'draw', icon: '✏️', label: 'Route' },
                  { id: 'arrow', icon: '➤', label: 'Arrow' },
                  { id: 'player', icon: '◉', label: 'Player' },
                  { id: 'erase', icon: '⌫', label: 'Erase' },
                ] as { id: Tool; icon: string; label: string }[]).map((t) => (
                  <button
                    key={t.id}
                    className={`tool-btn ${tool === t.id ? 'active' : ''}`}
                    onClick={() => setTool(t.id)}
                  >
                    <span className="tool-icon">{t.icon}</span>
                    <span className="tool-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            {(tool === 'draw' || tool === 'arrow') && (
              <>
                <div className="divider" />
                <div className="section-label">COLOR</div>
                <div className="color-row">
                  {ROUTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      className={`color-swatch ${color === c.value ? 'selected' : ''}`}
                      style={{ background: c.value }}
                      onClick={() => setColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="section-label" style={{ marginTop: 10 }}>WEIGHT</div>
                <div className="width-row">
                  {[2, 3, 5, 8].map((w) => (
                    <button
                      key={w}
                      className={`width-btn ${lineWidth === w ? 'active' : ''}`}
                      onClick={() => setLineWidth(w)}
                    >
                      <div className="width-preview" style={{ height: w + 1, background: color }} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Player config */}
            {tool === 'player' && (
              <>
                <div className="divider" />
                <div className="section-label">TEAM</div>
                <div className="team-toggle">
                  <button
                    className={`team-btn offense ${playerTeam === 'offense' ? 'active' : ''}`}
                    onClick={() => setPlayerTeam('offense')}
                  >⬤ OFF</button>
                  <button
                    className={`team-btn defense ${playerTeam === 'defense' ? 'active' : ''}`}
                    onClick={() => setPlayerTeam('defense')}
                  >■ DEF</button>
                </div>
                <div className="section-label" style={{ marginTop: 10 }}>POSITION</div>
                <div className="position-grid">
                  {['QB', 'WR', 'RB', 'TE', 'OL', 'CB', 'LB', 'S', 'DL', 'K'].map((pos) => (
                    <button
                      key={pos}
                      className={`pos-btn ${playerLabel === pos ? 'active' : ''}`}
                      onClick={() => setPlayerLabel(pos)}
                    >{pos}</button>
                  ))}
                </div>
              </>
            )}

            <div className="divider" />
            {/* Actions */}
            <div className="actions-section">
              <button className="btn-action" onClick={handleUndo} disabled={undoStack.length === 0}>
                ↩ UNDO
              </button>
              <button className="btn-action danger" onClick={handleClear}>
                ⊘ CLEAR
              </button>
            </div>

            <div className="export-section">
              <button className="btn-export" onClick={handleExport} disabled={exporting}>
                {exporting ? 'EXPORTING...' : '↓ EXPORT PDF'}
              </button>
            </div>
          </>
        )}

        <div className="sidebar-footer">
          <div className="footer-text">Prototype for FieldIQ</div>
        </div>
      </aside>

      {/* Main canvas area */}
      <main className="canvas-area">
        {activePlay ? (
          <>
            <div className="canvas-header">
              <div className="play-title">{activePlay.name}</div>
              <div className="canvas-hints">
                {tool === 'draw' && 'Click and drag to draw routes'}
                {tool === 'arrow' && 'Click and drag to draw directional arrows'}
                {tool === 'player' && 'Click to place a player on the field'}
                {tool === 'erase' && 'Click on a route or player to remove it'}
              </div>
            </div>
            <div className="canvas-wrapper">
              <FieldCanvas
                strokes={activePlay.strokes}
                players={activePlay.players}
                tool={tool}
                color={color}
                lineWidth={lineWidth}
                onStrokeComplete={handleStrokeComplete}
                onPlayerPlace={handlePlayerPlace}
                onEraseStroke={handleEraseStroke}
                onErasePlayer={handleErasePlayer}
                playerTeam={playerTeam}
                playerLabel={playerLabel}
              />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <div className="empty-title">NO PLAY SELECTED</div>
            <div className="empty-sub">Create a play in the sidebar to get started</div>
          </div>
        )}
      </main>
    </div>
  )
}
