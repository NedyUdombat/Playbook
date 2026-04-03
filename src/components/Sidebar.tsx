import React from 'react'
import { Play } from '../types'

interface SidebarProps {
  activePlay: Play | null
  onExport: () => void
  exporting: boolean
  onUpdateFormation: (val: string) => void
  onUpdateSituation: (val: string) => void
}

export function Sidebar({
  activePlay,
  onExport, exporting,
  onUpdateFormation, onUpdateSituation,
}: SidebarProps) {
  return (
    <aside className="sidebar">

      {/* ── Top bar ── */}
      <div className="sb-topbar">
        <span className="sb-appname">PLAYBOOK PROTO</span>
        <div className="sb-active-play">
          <span className="sb-active-label">ACTIVE PLAY</span>
          <span className="sb-active-name">{activePlay ? activePlay.name : '—'}</span>
        </div>
      </div>

      {/* ── Play Properties ── */}
      <div className="sb-section">
        <div className="sb-section-heading">PLAY PROPERTIES</div>
        <div className="sb-prop-row">
          <label className="sb-prop-label">Formation</label>
          <input
            className="sb-prop-input"
            placeholder="e.g. Shotgun"
            value={activePlay?.formation ?? ''}
            onChange={(e) => onUpdateFormation(e.target.value)}
            disabled={!activePlay}
          />
        </div>
        <div className="sb-prop-row">
          <label className="sb-prop-label">Situation</label>
          <input
            className="sb-prop-input"
            placeholder="e.g. 3rd & Long"
            value={activePlay?.situation ?? ''}
            onChange={(e) => onUpdateSituation(e.target.value)}
            disabled={!activePlay}
          />
        </div>
      </div>

      {/* ── Bottom Actions ── */}
      <div className="sb-bottom-actions">
        <button className="sb-btn-export" onClick={onExport} disabled={exporting}>
          {exporting ? 'EXPORTING...' : 'EXPORT PDF'}
        </button>
      </div>

    </aside>
  )
}
