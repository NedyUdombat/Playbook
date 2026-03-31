import React, { useState, useEffect, useRef } from 'react'
import { Play, MAX_PLAYS } from '../types'

interface TopBarProps {
  plays: Play[]
  activePlayId: string | null
  newPlayName: string
  setNewPlayName: (v: string) => void
  showNewPlay: boolean
  setShowNewPlay: (v: boolean) => void
  onCreatePlay: () => void
  onDeletePlay: (id: string) => void
  onSelectPlay: (id: string) => void
  firstDownYards: number
  setFirstDownYards: (v: number) => void
}

type Panel = 'help' | 'account' | null

export function TopBar({
  plays, activePlayId,
  newPlayName, setNewPlayName, showNewPlay, setShowNewPlay,
  onCreatePlay, onDeletePlay, onSelectPlay,
  firstDownYards, setFirstDownYards,
}: TopBarProps) {
  const canAddPlay = plays.length < MAX_PLAYS
  const [openPanel, setOpenPanel] = useState<Panel>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Preferences state
  const [showPlayerLabels, setShowPlayerLabels] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [defaultLineStyle, setDefaultLineStyle] = useState('solid')

  const toggle = (panel: Panel) =>
    setOpenPanel((prev) => (prev === panel ? null : panel))

  // Close panel on outside click
  useEffect(() => {
    if (!openPanel) return
    const handler = (e: MouseEvent) => {
      if (!actionsRef.current?.contains(e.target as Node)) setOpenPanel(null)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [openPanel])

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <span className="top-bar-logo-mark">◈</span>
        <span className="top-bar-app-name">PLAYBOOK</span>
      </div>

      <nav className="top-bar-nav">
        {plays.map((p) => (
          <button
            key={p.id}
            className={`top-bar-play-tab${p.id === activePlayId ? ' active' : ''}`}
            onClick={() => onSelectPlay(p.id)}
          >
            <span className="top-bar-play-tab-name">{p.name}</span>
            <span
              className="top-bar-play-tab-delete"
              onClick={(e) => { e.stopPropagation(); onDeletePlay(p.id) }}
              title="Delete play"
            >✕</span>
          </button>
        ))}

        {showNewPlay ? (
          <div className="top-bar-new-play-form">
            <input
              className="top-bar-new-play-input"
              placeholder="Play name..."
              value={newPlayName}
              onChange={(e) => setNewPlayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreatePlay()
                if (e.key === 'Escape') setShowNewPlay(false)
              }}
              autoFocus
            />
            <button className="top-bar-new-play-confirm" onClick={onCreatePlay}>✓</button>
            <button className="top-bar-new-play-cancel" onClick={() => setShowNewPlay(false)}>✕</button>
          </div>
        ) : (
          canAddPlay && (
            <button className="top-bar-add-play" onClick={() => setShowNewPlay(true)}>
              + NEW
            </button>
          )
        )}
      </nav>

      <div className="top-bar-actions" ref={actionsRef}>
        {/* Help */}
        <button
          className={`top-bar-icon-btn${openPanel === 'help' ? ' active' : ''}`}
          title="Keyboard shortcuts"
          onClick={() => toggle('help')}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M6.2 6c0-1 .8-1.7 1.8-1.7s1.8.7 1.8 1.7c0 .8-.5 1.3-1.2 1.7C8 8 7.8 8.4 7.8 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="7.8" cy="11" r=".7" fill="currentColor"/>
          </svg>
        </button>

        {/* Preferences */}
        <button
          className={`top-bar-icon-btn${openPanel === 'account' ? ' active' : ''}`}
          title="Preferences"
          onClick={() => toggle('account')}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M13.3 9.3a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1-1.7 1.7l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V13a1.2 1.2 0 0 1-2.4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1A1.2 1.2 0 0 1 4.2 10.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a1.2 1.2 0 0 1 0-2.4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1A1.2 1.2 0 0 1 5.5 2.8l.1.1a1 1 0 0 0 1.1.2h.1A1 1 0 0 0 7.4 2V2a1.2 1.2 0 0 1 2.4 0v.1a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 1.7l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H14a1.2 1.2 0 0 1 0 2.4h-.1a1 1 0 0 0-.9.6Z" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>

        {/* Help panel */}
        {openPanel === 'help' && (
          <div className="top-bar-panel" style={{ right: '44px' }}>
            <div className="top-bar-panel-header">
              <div className="top-bar-panel-title">Keyboard Shortcuts</div>
            </div>
            <div className="top-bar-panel-body">
              <div className="tb-help-section">
                <div className="tb-help-section-title">Tools</div>
                {[
                  ['Select', 'S'],
                  ['Route / Draw', 'D'],
                  ['Place Player', 'P'],
                  ['Text Note', 'N'],
                  ['Zone', 'Z'],
                  ['Eraser', 'E'],
                ].map(([label, key]) => (
                  <div className="tb-help-row" key={key}>
                    <span className="tb-help-label">{label}</span>
                    <div className="tb-help-keys"><span className="tb-key">{key}</span></div>
                  </div>
                ))}
              </div>
              <div className="tb-help-section">
                <div className="tb-help-section-title">Actions</div>
                {([
                  ['Undo', ['⌘', 'Z']],
                  ['Delete selected', ['⌫']],
                  ['Close / Deselect', ['Esc']],
                ] as [string, string[]][]).map(([label, keys]) => (
                  <div className="tb-help-row" key={label}>
                    <span className="tb-help-label">{label}</span>
                    <div className="tb-help-keys">
                      {keys.map((k) => <span className="tb-key" key={k}>{k}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preferences panel */}
        {openPanel === 'account' && (
          <div className="top-bar-panel" style={{ right: 0 }}>
            <div className="top-bar-panel-header">
              <div className="top-bar-panel-title">Preferences</div>
            </div>
            <div className="top-bar-panel-body">

              {/* Players */}
              <div className="tb-pref-section">
                <div className="tb-pref-section-title">Players</div>
                <div className="tb-pref-row">
                  <span className="tb-pref-label">Show Labels</span>
                  <button
                    className={`tb-pref-toggle${showPlayerLabels ? ' on' : ''}`}
                    onClick={() => setShowPlayerLabels(v => !v)}
                  >
                    <span className="tb-pref-toggle-thumb" />
                  </button>
                </div>
              </div>

              {/* Routes */}
              <div className="tb-pref-section">
                <div className="tb-pref-section-title">Routes</div>
                <div className="tb-pref-row">
                  <span className="tb-pref-label">Default Line Style</span>
                  <select
                    className="tb-pref-select"
                    value={defaultLineStyle}
                    onChange={e => setDefaultLineStyle(e.target.value)}
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                  </select>
                </div>
              </div>

              {/* Field */}
              <div className="tb-pref-section">
                <div className="tb-pref-section-title">Field</div>
                <div className="tb-pref-row">
                  <span className="tb-pref-label">First Down</span>
                  <div className="tb-pref-segmented">
                    {[10, 15, 20].map(v => (
                      <button
                        key={v}
                        className={`tb-pref-seg-btn${firstDownYards === v ? ' on' : ''}`}
                        onClick={() => setFirstDownYards(v)}
                      >{v} yds</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Canvas */}
              <div className="tb-pref-section">
                <div className="tb-pref-section-title">Canvas</div>
                <div className="tb-pref-row">
                  <span className="tb-pref-label">Snap to Grid</span>
                  <button
                    className={`tb-pref-toggle${snapToGrid ? ' on' : ''}`}
                    onClick={() => setSnapToGrid(v => !v)}
                  >
                    <span className="tb-pref-toggle-thumb" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </header>
  )
}
