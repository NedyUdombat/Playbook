import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Tool, LineStyle, Play } from '../types'
import { ROUTE_COLORS, OFFENSE_ROSTER, DEFENSE_ROSTER } from '../constants'

interface ToolRailProps {
  tool: Tool
  setTool: (t: Tool) => void
  onUndo: () => void
  onClear: () => void
  undoStackLength: number
  hasActivePlay: boolean
  color: string
  setColor: (c: string) => void
  lineWidth: number
  setLineWidth: (w: number) => void
  lineStyle: LineStyle
  setLineStyle: (s: LineStyle) => void
  noteColor: string
  setNoteColor: (c: string) => void
  activePlay: Play | null
  selectedEraseItems: Set<string>
  onEraseItem: (id: string, type: 'stroke' | 'player') => void
  onToggleEraseItem: (id: string) => void
  onSelectAllEraseItems: () => void
  onDeleteSelectedItems: () => void
}

const RAIL_TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: 'select', icon: 'near_me', label: 'Select' },
  { id: 'draw', icon: 'timeline', label: 'Route' },
  { id: 'player', icon: 'person_pin', label: 'Player' },
  { id: 'note', icon: 'title', label: 'Text' },
  { id: 'zone', icon: 'texture', label: 'Zone' },
  { id: 'erase', icon: 'ink_eraser', label: 'Eraser' },
]

const FLYOUT_TOOLS = new Set<Tool>(['draw', 'player', 'note', 'erase'])

export function ToolRail({
  tool, setTool, onUndo, onClear, undoStackLength, hasActivePlay,
  color, setColor, lineWidth, setLineWidth, lineStyle, setLineStyle,
  noteColor, setNoteColor,
  activePlay, selectedEraseItems, onEraseItem, onToggleEraseItem,
  onSelectAllEraseItems, onDeleteSelectedItems,
}: ToolRailProps) {
  const [flyoutTool, setFlyoutTool] = useState<Tool | null>(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const flyoutRef = useRef<HTMLDivElement>(null)

  const openFlyout = (toolId: Tool) => {
    const el = btnRefs.current[toolId]
    if (el) {
      const rect = el.getBoundingClientRect()
      setFlyoutPos({ top: rect.top, left: rect.right + 10 })
    }
    setFlyoutTool(toolId)
  }

  const handleToolClick = (toolId: Tool) => {
    if (!hasActivePlay) return
    setTool(toolId)
    if (FLYOUT_TOOLS.has(toolId)) {
      if (flyoutTool === toolId) {
        setFlyoutTool(null)
      } else {
        openFlyout(toolId)
      }
    } else {
      setFlyoutTool(null)
    }
  }

  // Close flyout on outside click
  useEffect(() => {
    if (!flyoutTool) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !flyoutRef.current?.contains(target) &&
        !target.closest('.rail-tool-btn')
      ) {
        setFlyoutTool(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [flyoutTool])

  // Close flyout on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFlyoutTool(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const flyoutContent = flyoutTool && (
    <div
      ref={flyoutRef}
      className="tool-flyout"
      style={{ top: flyoutPos.top, left: flyoutPos.left }}
    >
      <div className="tool-flyout-inner">

        {flyoutTool === 'draw' && (
          <>
            <div className="tf-section-label">COLOR</div>
            <div className="tf-color-row">
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

            <div className="tf-section-label">WEIGHT</div>
            <div className="tf-width-row">
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

            <div className="tf-section-label">STYLE</div>
            <div className="tf-style-row">
              <button
                className={`style-btn ${lineStyle === 'solid' ? 'active' : ''}`}
                onClick={() => setLineStyle('solid')}
              >
                <div className="style-preview solid" style={{ background: color }} />
                <span>Solid</span>
              </button>
              <button
                className={`style-btn ${lineStyle === 'dashed' ? 'active' : ''}`}
                onClick={() => setLineStyle('dashed')}
              >
                <div className="style-preview dashed" style={{ background: color }} />
                <span>Motion</span>
              </button>
            </div>
          </>
        )}

        {flyoutTool === 'player' && (
          <>
            <div className="tf-section-label">OFFENSE</div>
            <div className="tf-roster-grid">
              {[...new Set(OFFENSE_ROSTER)].map((pos, idx) => (
                <div
                  key={`off-${pos}-${idx}`}
                  className="roster-tile offense"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ team: 'offense', label: pos, shape: 'square' }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  {pos}
                </div>
              ))}
            </div>
            <div className="tf-section-label" style={{ marginTop: 10 }}>DEFENSE</div>
            <div className="tf-roster-grid">
              {[...new Set(DEFENSE_ROSTER)].map((pos, idx) => (
                <div
                  key={`def-${pos}-${idx}`}
                  className="roster-tile defense"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ team: 'defense', label: pos, shape: 'circle' }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  {pos}
                </div>
              ))}
            </div>
            <div className="roster-hint">Drag players to field</div>
          </>
        )}

        {flyoutTool === 'note' && (
          <>
            <div className="tf-section-label">NOTE COLOR</div>
            <div className="tf-color-row">
              {[
                { label: 'Yellow', value: 'yellow', bg: '#ffeb3b' },
                { label: 'Blue', value: 'blue', bg: '#42a5f5' },
                { label: 'Green', value: 'green', bg: '#66bb6a' },
                { label: 'Red', value: 'red', bg: '#ef5350' },
                { label: 'White', value: 'white', bg: '#ffffff' },
              ].map((c) => (
                <button
                  key={c.value}
                  className={`color-swatch ${noteColor === c.value ? 'selected' : ''}`}
                  style={{ background: c.bg }}
                  onClick={() => setNoteColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
            <div className="roster-hint">Click canvas to add · drag to move</div>
          </>
        )}

        {flyoutTool === 'erase' && activePlay && (
          <>
            <div className="tf-section-label">ITEMS ON FIELD</div>
            <div className="tf-erase-list">
              {activePlay.strokes.length === 0 && activePlay.players.length === 0 && (
                <div className="erase-empty">No items to erase</div>
              )}
              {activePlay.strokes.map((stroke, idx) => (
                <div key={stroke.id} className="erase-item">
                  <input
                    type="checkbox"
                    checked={selectedEraseItems.has(stroke.id)}
                    onChange={() => onToggleEraseItem(stroke.id)}
                    className="erase-checkbox"
                  />
                  <div className="erase-item-preview" style={{ background: stroke.color }} />
                  <span className="erase-item-label">
                    {stroke.tool === 'arrow' ? 'Arrow' : 'Route'} {idx + 1}
                  </span>
                  <button className="erase-item-btn" onClick={() => onEraseItem(stroke.id, 'stroke')}>✕</button>
                </div>
              ))}
              {activePlay.players.map((player) => (
                <div key={player.id} className="erase-item">
                  <input
                    type="checkbox"
                    checked={selectedEraseItems.has(player.id)}
                    onChange={() => onToggleEraseItem(player.id)}
                    className="erase-checkbox"
                  />
                  <div
                    className="erase-item-preview player"
                    style={{ background: player.color || (player.team === 'offense' ? '#e8ff47' : '#ff4757') }}
                  />
                  <span className="erase-item-label">{player.label}</span>
                  <button className="erase-item-btn" onClick={() => onEraseItem(player.id, 'player')}>✕</button>
                </div>
              ))}
            </div>
            {(activePlay.strokes.length > 0 || activePlay.players.length > 0) && (
              <div className="erase-actions">
                <button className="erase-select-all" onClick={onSelectAllEraseItems}>Select All</button>
                <button
                  className="erase-delete-selected"
                  onClick={onDeleteSelectedItems}
                  disabled={selectedEraseItems.size === 0}
                >
                  Delete ({selectedEraseItems.size})
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )

  return (
    <>
      <aside className="tool-rail">
        <div className="rail-tools">
          {RAIL_TOOLS.map((t) => (
            <button
              key={t.id}
              ref={(el) => { btnRefs.current[t.id] = el }}
              className={`rail-tool-btn ${tool === t.id ? 'active' : ''} ${flyoutTool === t.id ? 'flyout-open' : ''}`}
              onClick={() => handleToolClick(t.id)}
              disabled={!hasActivePlay}
              title={t.label}
            >
              <span className="material-symbols-outlined rail-tool-icon">{t.icon}</span>
              <span className="rail-tool-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="rail-bottom">
          <button
            className="rail-bottom-btn"
            onClick={onUndo}
            disabled={undoStackLength === 0 || !hasActivePlay}
            title="Undo (⌘Z)"
          >
            <span className="material-symbols-outlined">history</span>
            <span className="rail-tool-label">Undo</span>
          </button>
          <button
            className="rail-bottom-btn rail-clear-btn"
            onClick={onClear}
            disabled={!hasActivePlay}
            title="Clear all"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
            <span className="rail-tool-label">Clear</span>
          </button>
        </div>
      </aside>

      {flyoutContent && ReactDOM.createPortal(flyoutContent, document.body)}
    </>
  )
}
