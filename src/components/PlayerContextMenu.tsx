import React, { useState } from 'react'
import { Player, PlayerShape } from '../types'
import { ROUTE_COLORS, OFFENSE_ROSTER, DEFENSE_ROSTER } from '../constants'

interface PlayerContextMenuProps {
  selectedPlayer: Player
  contextMenuPos: { x: number; y: number }
  onClose: () => void
  onChangeLabel: (label: string) => void
  onChangeColor: (color: string | undefined) => void
  onChangeShape: (shape: PlayerShape) => void
  onDelete: () => void
  linkedToPlayer?: Player | null
  onAssignMan?: () => void
  onRemoveMan?: () => void
}

export function PlayerContextMenu({
  selectedPlayer, contextMenuPos,
  onClose, onChangeLabel, onChangeColor, onChangeShape, onDelete,
  linkedToPlayer, onAssignMan, onRemoveMan,
}: PlayerContextMenuProps) {
  const defaultColor = selectedPlayer.team === 'offense' ? '#e8ff47' : '#ff4757'
  const labelOptions = selectedPlayer.team === 'offense'
    ? [...new Set(OFFENSE_ROSTER)]
    : [...new Set(DEFENSE_ROSTER)]

  const [customLabel, setCustomLabel] = useState(selectedPlayer.label)

  function commitCustomLabel() {
    const val = customLabel.trim()
    if (val) onChangeLabel(val)
    else setCustomLabel(selectedPlayer.label)
  }

  return (
    <div
      className="player-context-menu"
      style={{
        position: 'fixed',
        left: contextMenuPos.x,
        top: contextMenuPos.y,
        transform: 'translate(-50%, 10px)',
      }}
    >
      <button className="context-menu-close" onClick={onClose}>✕</button>

      <div className="context-menu-section">
        <div className="context-menu-label">LABEL</div>
        <input
          className="context-menu-text-input"
          value={customLabel}
          maxLength={6}
          onChange={(e) => {
            setCustomLabel(e.target.value)
            if (e.target.value.trim()) onChangeLabel(e.target.value.trim())
          }}
          onBlur={commitCustomLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
          placeholder="custom…"
        />
        <div className="context-menu-options labels">
          {labelOptions.map((pos) => (
            <button
              key={pos}
              className={`context-option label ${selectedPlayer.label === pos ? 'active' : ''}`}
              onClick={() => { onChangeLabel(pos); setCustomLabel(pos) }}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="context-menu-section">
        <div className="context-menu-label">COLOR</div>
        <div className="context-menu-options colors">
          <button
            className={`context-option color-opt ${!selectedPlayer.color ? 'active' : ''}`}
            onClick={() => onChangeColor(undefined)}
            style={{ background: defaultColor }}
            title="Default"
          />
          {ROUTE_COLORS.map((c) => (
            <button
              key={c.value}
              className={`context-option color-opt ${selectedPlayer.color === c.value ? 'active' : ''}`}
              onClick={() => onChangeColor(c.value)}
              style={{ background: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="context-menu-section">
        <div className="context-menu-label">SHAPE</div>
        <div className="context-menu-options shapes">
          {([
            { id: 'square',   icon: '■', large: true },
            { id: 'circle',   icon: '●', large: true },
            { id: 'triangle', icon: '▲', large: false },
            { id: 'star',     icon: '★', large: false },
          ] as { id: PlayerShape; icon: string; large: boolean }[]).map((s) => (
            <button
              key={s.id}
              className={`context-option ${selectedPlayer.shape === s.id ? 'active' : ''}`}
              onClick={() => onChangeShape(s.id)}
              style={{ color: selectedPlayer.color || defaultColor, fontSize: s.large ? 35 : 21 }}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {(onAssignMan || onRemoveMan) && (
        <div className="context-menu-section">
          <div className="context-menu-label">MAN COVERAGE</div>
          {linkedToPlayer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#a8d8ff', fontWeight: 700, fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.04em' }}>
                → {linkedToPlayer.label}
              </span>
              <button
                className="context-menu-delete"
                style={{ marginTop: 0, padding: '2px 8px', fontSize: 11 }}
                onClick={onRemoveMan}
              >
                REMOVE
              </button>
            </div>
          ) : (
            <button
              style={{
                background: 'rgba(168, 216, 255, 0.12)',
                border: '1px solid rgba(168, 216, 255, 0.4)',
                borderRadius: 4,
                color: '#a8d8ff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: '"Barlow Condensed", sans-serif',
                letterSpacing: '0.05em',
                padding: '4px 10px',
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={() => { onAssignMan?.(); onClose() }}
            >
              ASSIGN MAN
            </button>
          )}
        </div>
      )}

      <div className="context-menu-section">
        <button className="context-menu-delete" onClick={onDelete}>
          Delete Player
        </button>
      </div>
    </div>
  )
}
