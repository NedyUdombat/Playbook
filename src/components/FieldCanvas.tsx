import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Point, Stroke, Player, Tool, PlayerTeam, LineStyle, PlayerShape, StickyNote, RouteAnnotation, Zone, ZoneShape, ManCoverageLink } from '../types'
import { drawField } from '../canvas/drawField'
import { drawStrokes } from '../canvas/drawStrokes'
import { drawPlayers, drawSelectionHighlight, drawManCoverageLinks } from '../canvas/drawPlayers'
import { drawStickyNotes, STICKY_COLORS, getNoteDeleteBtnCenter, hitTestNote } from '../canvas/drawStickyNotes'
import { drawZones } from '../canvas/drawZones'
import { getAdjustedStrokePoints, getPointOnPath, getClosestTOnPath, getCanvasPoint } from '../utils/pathUtils'
export { getFieldDimensions } from '../utils/fieldGeometry'

interface FieldCanvasProps {
  strokes: Stroke[]
  players: Player[]
  stickyNotes: StickyNote[]
  zones: Zone[]
  tool: Tool
  color: string
  lineWidth: number
  lineStyle: LineStyle
  zoneShape: ZoneShape
  zoneColor: string
  onStrokeComplete: (stroke: Stroke) => void
  onZoneComplete: (zone: Zone) => void
  onEraseZone: (id: string) => void
  onZoneClick?: (zoneId: string, screenX: number, screenY: number) => void
  onPlayerPlace: (player: Player) => void
  onEraseStroke: (id: string) => void
  onErasePlayer: (id: string) => void
  onSnapMarkerPlace: (player: Player) => void
  onPlayerClick?: (playerId: string, screenX: number, screenY: number) => void
  onPlayerMove?: (playerId: string, x: number, y: number) => void
  onStickyNotePlace?: (note: StickyNote) => void
  onStickyNoteMove?: (noteId: string, x: number, y: number) => void
  onStickyNoteUpdate?: (noteId: string, updates: Partial<StickyNote>) => void
  onStickyNoteDelete?: (noteId: string) => void
  onStrokeUpdate?: (strokeId: string, updates: Partial<Stroke>) => void
  onRouteDoubleClick?: (strokeId: string, t: number, screenX: number, screenY: number) => void
  playerTeam: PlayerTeam
  manCoverageLinks?: ManCoverageLink[]
  pendingManCoverageFromId?: string | null
  playerLabel: string
  playerShape: PlayerShape
  firstDownYards: number
  fieldColor?: string
  playName?: string
  noteColor?: string
}

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  strokes,
  players,
  stickyNotes = [],
  zones = [],
  tool,
  color,
  lineWidth,
  lineStyle,
  zoneShape,
  zoneColor,
  onStrokeComplete,
  onZoneComplete,
  onEraseZone,
  onZoneClick,
  onPlayerPlace,
  onEraseStroke,
  onErasePlayer,
  onSnapMarkerPlace,
  onPlayerClick,
  onPlayerMove,
  onStickyNotePlace,
  onStickyNoteMove,
  onStickyNoteUpdate,
  onStickyNoteDelete,
  onStrokeUpdate,
  playerTeam,
  playerLabel,
  playerShape,
  firstDownYards,
  noteColor = 'yellow',
  manCoverageLinks = [],
  pendingManCoverageFromId = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const currentPoints = useRef<Point[]>([])
  const zoneStart = useRef<Point | null>(null)
  const [currentZoneEnd, setCurrentZoneEnd] = useState<Point | null>(null)
  const [size, setSize] = useState({ w: 300, h: 700 })
  const [isDragOver, setIsDragOver] = useState(false)
  const draggingPlayer = useRef<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number; isSelectMode?: boolean } | null>(null)
  const dragMoved = useRef(false)
  const anchorPlayerId = useRef<string | null>(null)
  const branchFromStroke = useRef<{ strokeId: string; pointIndex: number; startPt: Point } | null>(null)
  const lastClickTime = useRef(0)
  const lastClickPos = useRef<Point>({ x: 0, y: 0 })
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'player' | 'stroke' } | null>(null)
  const [annotationInput, setAnnotationInput] = useState<{ strokeId: string; t: number; x: number; y: number } | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  const draggingNote = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(null)
  const [noteEditor, setNoteEditor] = useState<{
    id: string | null
    canvasX: number
    canvasY: number
    screenX: number
    screenY: number
    text: string
    color: string
  } | null>(null)

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ w: Math.floor(width), h: Math.floor(height) })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (tool !== 'select') setSelectedItem(null)
  }, [tool])

  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = size.w
    canvas.height = size.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawField(ctx, size.w, size.h, firstDownYards)
    drawZones(ctx, zones)
    drawStrokes(ctx, strokes, players)
    drawManCoverageLinks(ctx, players, manCoverageLinks)
    drawPlayers(ctx, players, size.w, size.h)
    drawStickyNotes(ctx, stickyNotes, size.w, size.h)
    if (selectedItem) drawSelectionHighlight(ctx, selectedItem, strokes, players, size.w, size.h)
    // Draw zone preview while dragging
    if (zoneStart.current && currentZoneEnd) {
      drawZones(ctx, [{ id: 'preview', x1: zoneStart.current.x, y1: zoneStart.current.y, x2: currentZoneEnd.x, y2: currentZoneEnd.y, shape: zoneShape, color: zoneColor }])
    }
  }, [strokes, players, stickyNotes, zones, size, firstDownYards, selectedItem, currentZoneEnd, zoneShape, zoneColor, manCoverageLinks])

  const redrawWithCurrent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawField(ctx, canvas.width, canvas.height, firstDownYards)
    drawZones(ctx, zones)
    drawStrokes(ctx, strokes, players)
    drawManCoverageLinks(ctx, players, manCoverageLinks)
    drawPlayers(ctx, players, canvas.width, canvas.height)
    drawStickyNotes(ctx, stickyNotes, canvas.width, canvas.height)
    if (selectedItem) drawSelectionHighlight(ctx, selectedItem, strokes, players, canvas.width, canvas.height)
    if (currentPoints.current.length > 1) {
      const tempStroke: Stroke = {
        id: 'temp',
        points: currentPoints.current,
        color,
        width: lineWidth,
        tool: tool === 'arrow' ? 'arrow' : 'draw',
        lineStyle,
      }
      drawStrokes(ctx, [tempStroke], players)
    }
  }, [strokes, players, stickyNotes, zones, color, lineWidth, tool, lineStyle, firstDownYards, selectedItem, manCoverageLinks])

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const pt = getCanvasPoint(canvas, e)

      const now = Date.now()
      const isDoubleClick =
        now - lastClickTime.current < 300 &&
        Math.sqrt((pt.x - lastClickPos.current.x) ** 2 + (pt.y - lastClickPos.current.y) ** 2) < 20
      lastClickTime.current = now
      lastClickPos.current = pt

      // Check note delete buttons first
      for (const note of [...stickyNotes].reverse()) {
        const btn = getNoteDeleteBtnCenter(note, canvas.width)
        const dx = pt.x - btn.cx
        const dy = pt.y - btn.cy
        if (Math.sqrt(dx * dx + dy * dy) <= btn.r * 1.2) {
          onStickyNoteDelete?.(note.id)
          return
        }
      }

      // Hit-test notes — draggable regardless of active tool
      for (const note of [...stickyNotes].reverse()) {
        if (hitTestNote(note, pt, canvas.width)) {
          draggingNote.current = { id: note.id, offsetX: pt.x - note.x, offsetY: pt.y - note.y, moved: false }
          return
        }
      }

      if (tool === 'note') {
        const rect2 = canvas.getBoundingClientRect()
        const sx2 = rect2.width / canvas.width
        const sy2 = rect2.height / canvas.height
        setNoteEditor({ id: null, canvasX: pt.x, canvasY: pt.y, screenX: pt.x * sx2, screenY: pt.y * sy2, text: '', color: noteColor })
        return
      }

      if (tool === 'erase') {
        for (const note of [...stickyNotes].reverse()) {
          if (hitTestNote(note, pt, canvas.width)) {
            onStickyNoteDelete?.(note.id)
            return
          }
        }
        const playerR = Math.min(canvas.width, canvas.height) * 0.03249
        for (const p of players) {
          const dx = p.x - pt.x
          const dy = p.y - pt.y
          if (Math.sqrt(dx * dx + dy * dy) < playerR * 1.5) {
            onErasePlayer(p.id)
            return
          }
        }
        for (const stroke of [...strokes].reverse()) {
          for (const sp of stroke.points) {
            const dx = sp.x - pt.x
            const dy = sp.y - pt.y
            if (Math.sqrt(dx * dx + dy * dy) < 16) {
              onEraseStroke(stroke.id)
              return
            }
          }
        }
        for (const zone of [...zones].reverse()) {
          const zx = Math.min(zone.x1, zone.x2)
          const zy = Math.min(zone.y1, zone.y2)
          const zw = Math.abs(zone.x2 - zone.x1)
          const zh = Math.abs(zone.y2 - zone.y1)
          if (pt.x >= zx && pt.x <= zx + zw && pt.y >= zy && pt.y <= zy + zh) {
            onEraseZone(zone.id)
            return
          }
        }
        return
      }

      if (tool === 'select') {
        const playerR = Math.min(canvas.width, canvas.height) * 0.03249
        for (const p of players) {
          const dx = p.x - pt.x
          const dy = p.y - pt.y
          if (Math.sqrt(dx * dx + dy * dy) < playerR * 1.4) {
            setSelectedItem({ id: p.id, type: 'player' })
            draggingPlayer.current = {
              id: p.id,
              startX: p.x,
              startY: p.y,
              offsetX: pt.x - p.x,
              offsetY: pt.y - p.y,
              isSelectMode: true,
            }
            dragMoved.current = false
            return
          }
        }
        for (const stroke of [...strokes].reverse()) {
          const points = getAdjustedStrokePoints(stroke, players)
          for (const sp of points) {
            const dx = sp.x - pt.x
            const dy = sp.y - pt.y
            if (Math.sqrt(dx * dx + dy * dy) < 14) {
              setSelectedItem({ id: stroke.id, type: 'stroke' })
              return
            }
          }
        }
        setSelectedItem(null)
        return
      }

      // Check if clicking on an existing player
      const playerR = Math.min(canvas.width, canvas.height) * 0.03249
      for (const p of players) {
        const dx = p.x - pt.x
        const dy = p.y - pt.y
        if (Math.sqrt(dx * dx + dy * dy) < playerR * 1.2) {
          if (tool === 'draw' || tool === 'arrow') {
            anchorPlayerId.current = p.id
            drawing.current = true
            currentPoints.current = [{ x: p.x, y: p.y }]
          } else {
            draggingPlayer.current = {
              id: p.id,
              startX: p.x,
              startY: p.y,
              offsetX: pt.x - p.x,
              offsetY: pt.y - p.y,
            }
            dragMoved.current = false
          }
          return
        }
      }

      if (tool === 'zone') {
        zoneStart.current = pt
        setCurrentZoneEnd(pt)
        return
      }

      if (tool === 'player') {
        return
      }

      if (tool === 'draw' || tool === 'arrow') {
        const STROKE_HIT = 14

        if (isDoubleClick) {
          for (const stroke of [...strokes].reverse()) {
            const strokePoints = getAdjustedStrokePoints(stroke, players)
            if (strokePoints.length < 2) continue
            const { distance, t } = getClosestTOnPath(strokePoints, pt)
            if (distance < STROKE_HIT * 1.5) {
              const rect = canvas.getBoundingClientRect()
              const scaleX = rect.width / canvas.width
              const scaleY = rect.height / canvas.height
              setAnnotationInput({ strokeId: stroke.id, t, x: pt.x * scaleX, y: pt.y * scaleY })
              setAnnotationText('')
              return
            }
          }
        }

        for (const stroke of [...strokes].reverse()) {
          const strokePoints = getAdjustedStrokePoints(stroke, players)
          if (strokePoints.length < 2) continue
          const { distance, t, closestPointIndex } = getClosestTOnPath(strokePoints, pt)
          if (distance < STROKE_HIT) {
            const branchPt = getPointOnPath(strokePoints, t)
            branchFromStroke.current = { strokeId: stroke.id, pointIndex: closestPointIndex, startPt: branchPt }
            drawing.current = true
            currentPoints.current = [branchPt]
            return
          }
        }
      }

      drawing.current = true
      currentPoints.current = [pt]
    },
    [tool, players, strokes, stickyNotes, zones, noteColor, onErasePlayer, onEraseStroke, onEraseZone, onStickyNoteDelete, onPlayerPlace, playerTeam, playerLabel, playerShape]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()
      const pt = getCanvasPoint(canvas, e)

      if (draggingNote.current) {
        const newX = pt.x - draggingNote.current.offsetX
        const newY = pt.y - draggingNote.current.offsetY
        draggingNote.current.moved = true
        onStickyNoteMove?.(draggingNote.current.id, newX, newY)
        return
      }

      if (draggingPlayer.current) {
        const newX = pt.x - draggingPlayer.current.offsetX
        const newY = pt.y - draggingPlayer.current.offsetY
        const dx = newX - draggingPlayer.current.startX
        const dy = newY - draggingPlayer.current.startY
        if (Math.sqrt(dx * dx + dy * dy) > 3) {
          dragMoved.current = true
        }
        onPlayerMove?.(draggingPlayer.current.id, newX, newY)
        return
      }

      if (tool === 'zone' && zoneStart.current) {
        setCurrentZoneEnd(pt)
        return
      }

      if (!drawing.current) return
      currentPoints.current.push(pt)
      redrawWithCurrent()
    },
    [redrawWithCurrent, onPlayerMove, onStickyNoteMove, tool]
  )

  const confirmNoteEditor = useCallback(() => {
    if (!noteEditor) return
    const { id, canvasX, canvasY, text, color } = noteEditor
    if (id === null) {
      if (text.trim()) {
        onStickyNotePlace?.({ id: `note_${Date.now()}`, x: canvasX, y: canvasY, text: text.trim(), color })
      }
    } else {
      onStickyNoteUpdate?.(id, { text: text.trim(), color })
    }
    setNoteEditor(null)
  }, [noteEditor, onStickyNotePlace, onStickyNoteUpdate])

  const cancelNoteEditor = useCallback(() => setNoteEditor(null), [])

  const deleteNoteFromEditor = useCallback(() => {
    if (!noteEditor || noteEditor.id === null) return
    onStickyNoteDelete?.(noteEditor.id)
    setNoteEditor(null)
  }, [noteEditor, onStickyNoteDelete])

  const handleEnd = useCallback(
    (e?: MouseEvent | TouchEvent) => {
      if (draggingNote.current) {
        const { id, moved } = draggingNote.current
        draggingNote.current = null
        if (!moved && tool === 'note') {
          const canvas = canvasRef.current
          const note = stickyNotes.find((n) => n.id === id)
          if (canvas && note) {
            const rect = canvas.getBoundingClientRect()
            const sx = rect.width / canvas.width
            const sy = rect.height / canvas.height
            setNoteEditor({ id: note.id, canvasX: note.x, canvasY: note.y, screenX: note.x * sx, screenY: note.y * sy, text: note.text, color: note.color })
          }
        }
        return
      }

      if (draggingPlayer.current) {
        const playerId = draggingPlayer.current.id
        const wasDragged = dragMoved.current
        const wasSelectMode = draggingPlayer.current.isSelectMode
        draggingPlayer.current = null
        dragMoved.current = false

        if (!wasDragged && !wasSelectMode && onPlayerClick) {
          const canvas = canvasRef.current
          if (canvas) {
            const player = players.find((p) => p.id === playerId)
            if (player) {
              const rect = canvas.getBoundingClientRect()
              const scaleX = rect.width / canvas.width
              const scaleY = rect.height / canvas.height
              const screenX = rect.left + player.x * scaleX
              const screenY = rect.top + player.y * scaleY
              onPlayerClick(playerId, screenX, screenY)
            }
          }
        }
        return
      }

      if (tool === 'zone' && zoneStart.current && currentZoneEnd) {
        const w = Math.abs(currentZoneEnd.x - zoneStart.current.x)
        const h = Math.abs(currentZoneEnd.y - zoneStart.current.y)
        if (w > 8 && h > 8) {
          const zone: Zone = {
            id: `zone_${Date.now()}`,
            x1: zoneStart.current.x,
            y1: zoneStart.current.y,
            x2: currentZoneEnd.x,
            y2: currentZoneEnd.y,
            shape: zoneShape,
            color: zoneColor,
          }
          onZoneComplete(zone)
        } else if (onZoneClick) {
          // Small drag = click — hit-test zones and show context menu
          const clickPt = zoneStart.current
          const canvas = canvasRef.current
          for (const zone of [...zones].reverse()) {
            const zx = Math.min(zone.x1, zone.x2)
            const zy = Math.min(zone.y1, zone.y2)
            const zw = Math.abs(zone.x2 - zone.x1)
            const zh = Math.abs(zone.y2 - zone.y1)
            if (clickPt.x >= zx && clickPt.x <= zx + zw && clickPt.y >= zy && clickPt.y <= zy + zh) {
              if (canvas) {
                const rect = canvas.getBoundingClientRect()
                const scaleX = rect.width / canvas.width
                const scaleY = rect.height / canvas.height
                onZoneClick(zone.id, rect.left + clickPt.x * scaleX, rect.top + clickPt.y * scaleY)
              }
              break
            }
          }
        }
        zoneStart.current = null
        setCurrentZoneEnd(null)
        return
      }

      if (!drawing.current) return
      drawing.current = false
      if (currentPoints.current.length < 2) {
        currentPoints.current = []
        anchorPlayerId.current = null
        return
      }
      const stroke: Stroke = {
        id: `stroke_${Date.now()}`,
        points: [...currentPoints.current],
        color,
        width: lineWidth,
        tool: tool === 'arrow' ? 'arrow' : 'draw',
        lineStyle,
        ...(anchorPlayerId.current ? { anchoredPlayerId: anchorPlayerId.current } : {}),
        ...(branchFromStroke.current
          ? { parentStrokeId: branchFromStroke.current.strokeId, branchPointIndex: branchFromStroke.current.pointIndex }
          : {}),
      }
      currentPoints.current = []
      anchorPlayerId.current = null
      branchFromStroke.current = null
      onStrokeComplete(stroke)
    },
    [color, lineWidth, tool, lineStyle, onStrokeComplete, onPlayerClick, players, stickyNotes, currentZoneEnd, zoneShape, zoneColor, onZoneComplete, zones, onEraseZone, onZoneClick]
  )

  const confirmAnnotation = useCallback(() => {
    if (!annotationInput || !annotationText.trim()) {
      setAnnotationInput(null)
      return
    }
    const stroke = strokes.find(s => s.id === annotationInput.strokeId)
    if (stroke) {
      const annotation: RouteAnnotation = {
        id: `ann_${Date.now()}`,
        t: annotationInput.t,
        label: annotationText.trim().toUpperCase(),
      }
      onStrokeUpdate?.(annotationInput.strokeId, {
        annotations: [...(stroke.annotations || []), annotation],
      })
    }
    setAnnotationInput(null)
    setAnnotationText('')
  }, [annotationInput, annotationText, strokes, onStrokeUpdate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousedown', handleStart)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseup', handleEnd)
    canvas.addEventListener('mouseleave', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleEnd)
    return () => {
      canvas.removeEventListener('mousedown', handleStart)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleEnd)
      canvas.removeEventListener('mouseleave', handleEnd)
      canvas.removeEventListener('touchstart', handleStart)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleEnd)
    }
  }, [handleStart, handleMove, handleEnd])

  const getCursor = () => {
    if (pendingManCoverageFromId) return 'cell'
    if (tool === 'select') return 'default'
    if (tool === 'erase') return 'pointer'
    return 'crosshair'
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const canvas = canvasRef.current
      if (!canvas) return

      const data = e.dataTransfer.getData('application/json')
      if (!data) return

      try {
        const playerData = JSON.parse(data) as { team: PlayerTeam; label: string; shape: PlayerShape }
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        const player: Player = {
          id: `player_${Date.now()}`,
          x,
          y,
          team: playerData.team,
          label: playerData.label,
          number: players.length + 1,
          shape: playerData.shape,
        }
        onPlayerPlace(player)
      } catch {
        // Invalid data, ignore
      }
    },
    [players.length, onPlayerPlace]
  )

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 0 5px rgba(255,255,255,0.5)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: getCursor() }}
      />
      {noteEditor && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={cancelNoteEditor} />
          <div
            style={{
              position: 'absolute',
              left: noteEditor.screenX,
              top: noteEditor.screenY,
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              background: 'rgba(10, 12, 15, 0.97)',
              border: '1px solid rgba(232, 255, 71, 0.35)',
              borderRadius: 6,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              minWidth: 170,
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={noteEditor.text}
              onChange={(e) => setNoteEditor((prev) => prev ? { ...prev, text: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmNoteEditor() }
                if (e.key === 'Escape') { e.stopPropagation(); cancelNoteEditor() }
              }}
              placeholder="3 STEP DROP..."
              rows={3}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: '"Barlow Condensed", sans-serif',
                padding: '4px 6px',
                width: '100%',
                resize: 'none',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {(['yellow', 'blue', 'green', 'red', 'white'] as const).map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => { e.preventDefault(); setNoteEditor((prev) => prev ? { ...prev, color: c } : null) }}
                  style={{
                    width: 20,
                    height: 20,
                    background: STICKY_COLORS[c].bg,
                    border: noteEditor.color === c ? '2px solid #e8ff47' : '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                  title={c}
                />
              ))}
              {noteEditor.id !== null && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); deleteNoteFromEditor() }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                  title="Delete note"
                >✕</button>
              )}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(232,255,71,0.4)', fontFamily: 'monospace' }}>↵ save · Esc cancel</div>
          </div>
        </div>
      )}
      {annotationInput && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: annotationInput.x,
              top: annotationInput.y,
              transform: 'translate(-50%, calc(-100% - 10px))',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <input
              autoFocus
              value={annotationText}
              onChange={e => setAnnotationText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAnnotation()
                if (e.key === 'Escape') { setAnnotationInput(null); setAnnotationText('') }
              }}
              onBlur={() => { setAnnotationInput(null); setAnnotationText('') }}
              placeholder="10 YDS"
              style={{
                background: 'rgba(10, 12, 15, 0.95)',
                border: '1px solid rgba(232, 255, 71, 0.7)',
                borderRadius: 4,
                color: '#e8ff47',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: '"Barlow Condensed", sans-serif',
                padding: '3px 8px',
                width: 80,
                outline: 'none',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            />
            <div style={{ fontSize: 10, color: 'rgba(232,255,71,0.5)', fontFamily: 'monospace' }}>↵ confirm</div>
          </div>
        </div>
      )}
      {pendingManCoverageFromId && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(168, 216, 255, 0.15)',
            border: '1px solid #a8d8ff',
            borderRadius: 6,
            color: '#a8d8ff',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: '"Barlow Condensed", sans-serif',
            letterSpacing: '0.05em',
            padding: '5px 14px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          CLICK RECEIVER TO ASSIGN MAN · ESC TO CANCEL
        </div>
      )}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '3px dashed #e8ff47',
            borderRadius: 8,
            backgroundColor: 'rgba(232, 255, 71, 0.1)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ color: '#e8ff47', fontWeight: 700, fontSize: 16 }}>DROP PLAYER HERE</div>
        </div>
      )}
    </div>
  )
}
