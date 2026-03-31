import React from 'react'
import { Play, Stroke, Player, Tool, LineStyle, PlayerTeam, PlayerShape, StickyNote } from '../types'
import { FieldCanvas } from './FieldCanvas'

interface CanvasAreaProps {
  activePlay: Play
  editingPlayName: boolean
  tempPlayName: string
  setTempPlayName: (v: string) => void
  onStartEditingPlayName: () => void
  onSavePlayName: () => void
  onCancelEditingPlayName: () => void
  tool: Tool
  color: string
  lineWidth: number
  lineStyle: LineStyle
  undoStackLength: number
  onUndo: () => void
  onClear: () => void
  onStrokeComplete: (stroke: Stroke) => void
  onPlayerPlace: (player: Player) => void
  onEraseStroke: (id: string) => void
  onErasePlayer: (id: string) => void
  onSnapMarkerPlace: (player: Player) => void
  onStickyNoteAdd?: (note: StickyNote) => void
  onStickyNoteUpdate?: (id: string, updates: Partial<StickyNote>) => void
  onStickyNoteDelete?: (id: string) => void
  onStickyNoteMove?: (id: string, x: number, y: number) => void
  onStrokeUpdate?: (strokeId: string, updates: Partial<Stroke>) => void
  noteColor?: string
  onPlayerClick: (playerId: string, screenX: number, screenY: number) => void
  onPlayerMove: (playerId: string, x: number, y: number) => void
  playerTeam: PlayerTeam
  playerLabel: string
  playerShape: PlayerShape
  firstDownYards: number
  canvasWrapperRef: React.RefObject<HTMLDivElement>
  onNotesChange: (notes: string) => void
}

export function CanvasArea({
  activePlay,
  editingPlayName, tempPlayName, setTempPlayName,
  onStartEditingPlayName, onSavePlayName, onCancelEditingPlayName,
  tool, color, lineWidth, lineStyle,
  undoStackLength, onUndo, onClear,
  onStrokeComplete, onPlayerPlace, onEraseStroke, onErasePlayer,
  onSnapMarkerPlace, onPlayerClick, onPlayerMove,
  onStickyNoteAdd, onStickyNoteUpdate, onStickyNoteDelete, onStickyNoteMove,
  onStrokeUpdate,
  playerTeam, playerLabel, playerShape, firstDownYards,
  noteColor,
  canvasWrapperRef, onNotesChange,
}: CanvasAreaProps) {
  return (
    <>
      <div className="canvas-wrapper" ref={canvasWrapperRef}>
        <div className="field-column">
          <FieldCanvas
            strokes={activePlay.strokes}
            players={activePlay.players}
            stickyNotes={activePlay.stickyNotes}
            tool={tool}
            color={color}
            lineWidth={lineWidth}
            lineStyle={lineStyle}
            onStrokeComplete={onStrokeComplete}
            onPlayerPlace={onPlayerPlace}
            onEraseStroke={onEraseStroke}
            onErasePlayer={onErasePlayer}
            onSnapMarkerPlace={onSnapMarkerPlace}
            onPlayerClick={onPlayerClick}
            onPlayerMove={onPlayerMove}
            onStickyNotePlace={onStickyNoteAdd}
            onStickyNoteUpdate={onStickyNoteUpdate}
            onStickyNoteDelete={onStickyNoteDelete}
            onStickyNoteMove={onStickyNoteMove}
            onStrokeUpdate={onStrokeUpdate}
            playerTeam={playerTeam}
            playerLabel={playerLabel}
            playerShape={playerShape}
            firstDownYards={firstDownYards}
            noteColor={noteColor}
          />
          <div className="notes-section">
            <label className="notes-label">NOTES</label>
            <textarea
              className="notes-input"
              placeholder="Add play notes (formations, reads, adjustments...)"
              value={activePlay.notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="live-edit-badge">
        <span className="live-edit-dot" />
        LIVE EDIT MODE
      </div>
    </>
  )
}

