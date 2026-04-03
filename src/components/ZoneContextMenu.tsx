import React from 'react'
import { Zone } from '../types'
import { ROUTE_COLORS } from '../constants'

interface ZoneContextMenuProps {
  zone: Zone
  contextMenuPos: { x: number; y: number }
  onClose: () => void
  onChangeColor: (color: string) => void
  onDelete: () => void
}

export function ZoneContextMenu({
  zone, contextMenuPos, onClose, onChangeColor, onDelete,
}: ZoneContextMenuProps) {
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
        <div className="context-menu-label">COLOR</div>
        <div className="context-menu-options colors">
          {ROUTE_COLORS.map((c) => (
            <button
              key={c.value}
              className={`context-option color-opt ${zone.color === c.value ? 'active' : ''}`}
              onClick={() => onChangeColor(c.value)}
              style={{ background: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="context-menu-section">
        <button className="context-menu-delete" onClick={onDelete}>
          Delete Zone
        </button>
      </div>
    </div>
  )
}
