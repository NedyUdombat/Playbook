import React, { useCallback, useEffect, useRef, useState } from "react";
import { CanvasArea } from "./components/CanvasArea";
import { EmptyState } from "./components/EmptyState";
import { getFieldDimensions } from "./components/FieldCanvas";
import { PlayerContextMenu } from "./components/PlayerContextMenu";
import { ZoneContextMenu } from "./components/ZoneContextMenu";
import { Sidebar } from "./components/Sidebar";
import { ToolRail } from "./components/ToolRail";
import { TopBar } from "./components/TopBar";
import { newPlay } from "./constants";
import { loadPlays, savePlays } from "./storage";
import {
	type LineStyle,
	MAX_PLAYS,
	type Play,
	type Player,
	type PlayerShape,
	type PlayerTeam,
	type StickyNote,
	type Stroke,
	type Tool,
	type Zone,
	type ZoneShape,
} from "./types";
import { exportPlayToPDF } from "./utils/exportPDF";
import "./App.css";

export default function App() {
	const [plays, setPlays] = useState<Play[]>(() => loadPlays());
	const [activePlayId, setActivePlayId] = useState<string | null>(() => {
		const loaded = loadPlays();
		return loaded.length > 0 ? loaded[0].id : null;
	});
	const [tool, setTool] = useState<Tool>("draw");
	const [color, setColor] = useState("#caff6f");
	const [lineWidth, setLineWidth] = useState(3);
	const [playerTeam, setPlayerTeam] = useState<PlayerTeam>("offense");
	const [playerLabel, setPlayerLabel] = useState("QB");
	const [newPlayName, setNewPlayName] = useState("");
	const [showNewPlay, setShowNewPlay] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [undoStack, setUndoStack] = useState<
		{ strokes: Stroke[]; players: Player[]; zones: Zone[] }[]
	>([]);
	const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
	const [playerShape, setPlayerShape] = useState<PlayerShape>("square");
	const [firstDownYards, setFirstDownYards] = useState(15);
	const [noteColor, setNoteColor] = useState("yellow");
	const [zoneShape, setZoneShape] = useState<ZoneShape>("rectangle");
	const [zoneColor, setZoneColor] = useState("#e8ff47");
	const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
	const [contextMenuPos, setContextMenuPos] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
	const [zoneContextMenuPos, setZoneContextMenuPos] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [pendingManCoverageFromId, setPendingManCoverageFromId] = useState<string | null>(null);
	const pendingManCoverageFromIdRef = useRef<string | null>(null);
	const [editingPlayName, setEditingPlayName] = useState(false);
	const [tempPlayName, setTempPlayName] = useState("");
	const [selectedEraseItems, setSelectedEraseItems] = useState<Set<string>>(
		new Set(),
	);
	const canvasWrapperRef = useRef<HTMLDivElement>(null);

	const activePlay = plays.find((p) => p.id === activePlayId) ?? null;

	const persist = useCallback((updated: Play[]) => {
		setPlays(updated);
		savePlays(updated);
	}, []);

	const updateActivePlay = useCallback(
		(updater: (play: Play) => Play) => {
			setPlays((prev) => {
				const next = prev.map((p) => (p.id === activePlayId ? updater(p) : p));
				savePlays(next);
				return next;
			});
		},
		[activePlayId],
	);

	const pushUndo = useCallback(() => {
		if (!activePlay) return;
		setUndoStack((s) => [
			...s.slice(-20),
			{ strokes: activePlay.strokes, players: activePlay.players, zones: activePlay.zones || [] },
		]);
	}, [activePlay]);

	const handleStrokeComplete = useCallback(
		(stroke: Stroke) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({ ...p, strokes: [...p.strokes, stroke] }));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleZoneComplete = useCallback(
		(zone: Zone) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({ ...p, zones: [...(p.zones || []), zone] }));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleEraseZone = useCallback(
		(id: string) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({ ...p, zones: (p.zones || []).filter((z) => z.id !== id) }));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleZoneClick = useCallback(
		(zoneId: string, screenX: number, screenY: number) => {
			setSelectedZoneId(zoneId);
			setZoneContextMenuPos({ x: screenX, y: screenY });
		},
		[],
	);

	const handleZoneUpdate = useCallback(
		(zoneId: string, updates: Partial<Zone>) => {
			if (!activePlay) return;
			updateActivePlay((p) => ({
				...p,
				zones: (p.zones || []).map((z) => z.id === zoneId ? { ...z, ...updates } : z),
			}));
		},
		[activePlay, updateActivePlay],
	);

	const closeZoneContextMenu = () => {
		setSelectedZoneId(null);
		setZoneContextMenuPos(null);
	};

	const handlePlayerPlace = useCallback(
		(player: Player) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({ ...p, players: [...p.players, player] }));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleEraseStroke = useCallback(
		(id: string) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({
				...p,
				strokes: p.strokes.filter((s) => s.id !== id),
			}));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleErasePlayer = useCallback(
		(id: string) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({
				...p,
				players: p.players.filter((pl) => pl.id !== id),
			}));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleUndo = useCallback(() => {
		if (undoStack.length === 0 || !activePlay) return;
		const prev = undoStack[undoStack.length - 1];
		setUndoStack((s) => s.slice(0, -1));
		updateActivePlay((p) => ({
			...p,
			strokes: prev.strokes,
			players: prev.players,
			zones: prev.zones,
		}));
	}, [undoStack, activePlay, updateActivePlay]);

	const handleClear = useCallback(() => {
		if (!activePlay) return;
		pushUndo();
		updateActivePlay((p) => ({ ...p, strokes: [], players: [], zones: [] }));
	}, [activePlay, updateActivePlay, pushUndo]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest(".player-context-menu")) {
				setSelectedPlayerId(null);
				setContextMenuPos(null);
				setSelectedZoneId(null);
				setZoneContextMenuPos(null);
			}
		};
		if (selectedPlayerId || selectedZoneId) {
			window.addEventListener("mousedown", handleClickOutside);
			return () => window.removeEventListener("mousedown", handleClickOutside);
		}
	}, [selectedPlayerId, selectedZoneId]);

	const handlePlayerClick = useCallback(
		(playerId: string, screenX: number, screenY: number) => {
			const fromId = pendingManCoverageFromIdRef.current;
			if (fromId) {
				if (playerId !== fromId) {
					setPlays((prev) => {
						const next = prev.map((p) =>
							p.id === activePlayId
								? {
										...p,
										manCoverageLinks: [
											...(p.manCoverageLinks || []).filter(
												(l) => l.defenderId !== fromId
											),
											{ id: `man_${Date.now()}`, defenderId: fromId, receiverId: playerId },
										],
									}
								: p,
						);
						savePlays(next);
						return next;
					});
				}
				pendingManCoverageFromIdRef.current = null;
				setPendingManCoverageFromId(null);
				return;
			}
			setSelectedPlayerId(playerId);
			setContextMenuPos({ x: screenX, y: screenY });
		},
		[activePlayId],
	);

	const handlePlayerUpdate = useCallback(
		(playerId: string, updates: Partial<Player>) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({
				...p,
				players: p.players.map((pl) =>
					pl.id === playerId ? { ...pl, ...updates } : pl,
				),
			}));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleRemoveManCoverageLink = useCallback(
		(defenderId: string) => {
			if (!activePlay) return;
			updateActivePlay((p) => ({
				...p,
				manCoverageLinks: (p.manCoverageLinks || []).filter(
					(l) => l.defenderId !== defenderId
				),
			}));
		},
		[activePlay, updateActivePlay],
	);

	const handleStrokeUpdate = useCallback(
		(strokeId: string, updates: Partial<Stroke>) => {
			if (!activePlay) return;
			updateActivePlay((p) => ({
				...p,
				strokes: p.strokes.map((s) =>
					s.id === strokeId ? { ...s, ...updates } : s,
				),
			}));
		},
		[activePlay, updateActivePlay],
	);

	const handlePlayerMove = useCallback(
		(playerId: string, x: number, y: number) => {
			setPlays((prev) => {
				const next = prev.map((p) =>
					p.id === activePlayId
						? {
								...p,
								players: p.players.map((pl) =>
									pl.id === playerId ? { ...pl, x, y } : pl,
								),
							}
						: p,
				);
				savePlays(next);
				return next;
			});
		},
		[activePlayId],
	);

	const handleSnapMarkerPlace = useCallback(
		(player: Player) => {
			if (!activePlay) return;
			pushUndo();
			updateActivePlay((p) => ({ ...p, players: [...p.players, player] }));
		},
		[activePlay, updateActivePlay, pushUndo],
	);

	const handleNotesChange = useCallback(
		(notes: string) => {
			updateActivePlay((p) => ({ ...p, notes }));
		},
		[updateActivePlay],
	);

	const handleUpdateFormation = useCallback(
		(formation: string) => {
			updateActivePlay((p) => ({ ...p, formation }));
		},
		[updateActivePlay],
	);

	const handleUpdateSituation = useCallback(
		(situation: string) => {
			updateActivePlay((p) => ({ ...p, situation }));
		},
		[updateActivePlay],
	);

	const handleStickyNoteAdd = useCallback(
		(note: StickyNote) => {
			if (!activePlay) return;
			updateActivePlay((p) => ({
				...p,
				stickyNotes: [...(p.stickyNotes || []), note],
			}));
		},
		[activePlay, updateActivePlay],
	);

	const handleStickyNoteUpdate = useCallback(
		(id: string, updates: Partial<StickyNote>) => {
			if (!activePlay) return;
			updateActivePlay((p) => ({
				...p,
				stickyNotes: (p.stickyNotes || []).map((n) =>
					n.id === id ? { ...n, ...updates } : n,
				),
			}));
		},
		[activePlay, updateActivePlay],
	);

	const handleStickyNoteDelete = useCallback(
		(id: string) => {
			if (!activePlay) return;
			updateActivePlay((p) => ({
				...p,
				stickyNotes: (p.stickyNotes || []).filter((n) => n.id !== id),
			}));
		},
		[activePlay, updateActivePlay],
	);

	const handleStickyNoteMove = useCallback(
		(id: string, x: number, y: number) => {
			setPlays((prev) => {
				const next = prev.map((p) =>
					p.id === activePlayId
						? {
								...p,
								stickyNotes: (p.stickyNotes || []).map((n) =>
									n.id === id ? { ...n, x, y } : n,
								),
							}
						: p,
				);
				savePlays(next);
				return next;
			});
		},
		[activePlayId],
	);

	const handleCreatePlay = useCallback(() => {
		if (plays.length >= MAX_PLAYS) return;
		const name = newPlayName.trim() || `Play ${plays.length + 1}`;
		const play = newPlay(name);
		const updated = [...plays, play];
		persist(updated);
		setActivePlayId(play.id);
		setNewPlayName("");
		setShowNewPlay(false);
		setUndoStack([]);
	}, [plays, newPlayName, persist]);

	const handleDeletePlay = useCallback(
		(id: string) => {
			const updated = plays.filter((p) => p.id !== id);
			persist(updated);
			if (activePlayId === id) {
				setActivePlayId(updated.length > 0 ? updated[0].id : null);
			}
		},
		[plays, activePlayId, persist],
	);

	const handleExport = useCallback(async () => {
		if (!activePlay) return;
		const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
		if (!canvas) return;
		setExporting(true);
		try {
			await exportPlayToPDF(canvas, activePlay);
		} finally {
			setExporting(false);
		}
	}, [activePlay]);

	const handleSelectPlay = (id: string) => {
		setActivePlayId(id);
		setUndoStack([]);
	};

	const handleEraseItem = (id: string, type: "stroke" | "player" | "zone") => {
		if (type === "stroke") handleEraseStroke(id);
		else if (type === "player") handleErasePlayer(id);
		else handleEraseZone(id);
		setSelectedEraseItems((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	};

	const toggleEraseItemSelection = (id: string) => {
		setSelectedEraseItems((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAllEraseItems = () => {
		if (!activePlay) return;
		const allIds = new Set<string>();
		activePlay.strokes.forEach((s) => allIds.add(s.id));
		activePlay.players.forEach((p) => allIds.add(p.id));
		(activePlay.zones || []).forEach((z) => allIds.add(z.id));
		setSelectedEraseItems(allIds);
	};

	const deleteSelectedItems = useCallback(() => {
		if (!activePlay) return;
		pushUndo();
		updateActivePlay((p) => ({
			...p,
			strokes: p.strokes.filter((s) => !selectedEraseItems.has(s.id)),
			players: p.players.filter((pl) => !selectedEraseItems.has(pl.id)),
			zones: (p.zones || []).filter((z) => !selectedEraseItems.has(z.id)),
		}));
		setSelectedEraseItems(new Set());
	}, [activePlay, pushUndo, updateActivePlay, selectedEraseItems]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const isTyping =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable;

			if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				handleUndo();
				return;
			}

			if (e.key === "Escape") {
				setSelectedPlayerId(null);
				setContextMenuPos(null);
				setSelectedZoneId(null);
				setZoneContextMenuPos(null);
				pendingManCoverageFromIdRef.current = null;
				setPendingManCoverageFromId(null);
				return;
			}

			if (isTyping) return;

			// Tool shortcuts
			if (!e.metaKey && !e.ctrlKey && !e.altKey) {
				switch (e.key.toLowerCase()) {
					case "s":
						setTool("select");
						return;
					case "d":
						setTool("draw");
						return;
					case "p":
						setTool("player");
						return;
					case "n":
						setTool("note");
						return;
					case "z":
						setTool("zone");
						return;
					case "e":
						setTool("erase");
						return;
				}
			}

			// Delete selected
			if (e.key === "Backspace" || e.key === "Delete") {
				if (selectedPlayerId) {
					e.preventDefault();
					handleErasePlayer(selectedPlayerId);
					setSelectedPlayerId(null);
					setContextMenuPos(null);
				} else if (selectedEraseItems.size > 0) {
					e.preventDefault();
					deleteSelectedItems();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		handleUndo,
		selectedPlayerId,
		selectedEraseItems,
		handleErasePlayer,
		deleteSelectedItems,
	]);

	const startEditingPlayName = () => {
		if (activePlay) {
			setTempPlayName(activePlay.name);
			setEditingPlayName(true);
		}
	};

	const savePlayName = () => {
		if (activePlay && tempPlayName.trim()) {
			updateActivePlay((p) => ({ ...p, name: tempPlayName.trim() }));
		}
		setEditingPlayName(false);
	};

	const selectedPlayer =
		activePlay?.players.find((p) => p.id === selectedPlayerId) ?? null;

	const closeContextMenu = () => {
		setSelectedPlayerId(null);
		setContextMenuPos(null);
	};

	return (
		<div className="app">
			<TopBar
				plays={plays}
				activePlayId={activePlayId}
				newPlayName={newPlayName}
				setNewPlayName={setNewPlayName}
				showNewPlay={showNewPlay}
				setShowNewPlay={setShowNewPlay}
				onCreatePlay={handleCreatePlay}
				onDeletePlay={handleDeletePlay}
				onSelectPlay={handleSelectPlay}
				onRenamePlay={(id, name) => {
					setPlays((prev) => {
						const next = prev.map((p) => p.id === id ? { ...p, name } : p)
						savePlays(next)
						return next
					})
				}}
				firstDownYards={firstDownYards}
				setFirstDownYards={setFirstDownYards}
			/>
			<div className="app-body">
				<ToolRail
					tool={tool}
					setTool={setTool}
					onUndo={handleUndo}
					onClear={handleClear}
					undoStackLength={undoStack.length}
					hasActivePlay={activePlay !== null}
					color={color}
					setColor={setColor}
					lineWidth={lineWidth}
					setLineWidth={setLineWidth}
					lineStyle={lineStyle}
					setLineStyle={setLineStyle}
					noteColor={noteColor}
					setNoteColor={setNoteColor}
					activePlay={activePlay}
					selectedEraseItems={selectedEraseItems}
					onEraseItem={handleEraseItem}
					onToggleEraseItem={toggleEraseItemSelection}
					onSelectAllEraseItems={selectAllEraseItems}
					onDeleteSelectedItems={deleteSelectedItems}
					zoneShape={zoneShape}
					setZoneShape={setZoneShape}
					zoneColor={zoneColor}
					setZoneColor={setZoneColor}
				/>

				<Sidebar
					activePlay={activePlay}
					onExport={handleExport}
					exporting={exporting}
					onUpdateFormation={handleUpdateFormation}
					onUpdateSituation={handleUpdateSituation}
				/>

				<main className="canvas-area ">
					{activePlay ? (
						<CanvasArea
							activePlay={activePlay}
							editingPlayName={editingPlayName}
							tempPlayName={tempPlayName}
							setTempPlayName={setTempPlayName}
							onStartEditingPlayName={startEditingPlayName}
							onSavePlayName={savePlayName}
							onCancelEditingPlayName={() => setEditingPlayName(false)}
							tool={tool}
							color={color}
							lineWidth={lineWidth}
							lineStyle={lineStyle}
							zoneShape={zoneShape}
							zoneColor={zoneColor}
							undoStackLength={undoStack.length}
							onUndo={handleUndo}
							onClear={handleClear}
							onStrokeComplete={handleStrokeComplete}
							onZoneComplete={handleZoneComplete}
							onEraseZone={handleEraseZone}
							onPlayerPlace={handlePlayerPlace}
							onEraseStroke={handleEraseStroke}
							onErasePlayer={handleErasePlayer}
							onSnapMarkerPlace={handleSnapMarkerPlace}
							onPlayerClick={handlePlayerClick}
							onPlayerMove={handlePlayerMove}
							onZoneClick={handleZoneClick}
							onStrokeUpdate={handleStrokeUpdate}
							onStickyNoteAdd={handleStickyNoteAdd}
							onStickyNoteUpdate={handleStickyNoteUpdate}
							onStickyNoteDelete={handleStickyNoteDelete}
							onStickyNoteMove={handleStickyNoteMove}
							playerTeam={playerTeam}
							playerLabel={playerLabel}
							playerShape={playerShape}
							firstDownYards={firstDownYards}
							noteColor={noteColor}
							canvasWrapperRef={canvasWrapperRef}
							onNotesChange={handleNotesChange}
							pendingManCoverageFromId={pendingManCoverageFromId}
						/>
					) : (
						<EmptyState
							hasNoPlays={plays.length === 0}
							onCreatePlay={handleCreatePlay}
						/>
					)}
				</main>

				{selectedZoneId && zoneContextMenuPos && activePlay?.zones.find((z) => z.id === selectedZoneId) && (
					<ZoneContextMenu
						zone={activePlay.zones.find((z) => z.id === selectedZoneId)!}
						contextMenuPos={zoneContextMenuPos}
						onClose={closeZoneContextMenu}
						onChangeColor={(color) => {
							handleZoneUpdate(selectedZoneId, { color });
						}}
						onDelete={() => {
							handleEraseZone(selectedZoneId);
							closeZoneContextMenu();
						}}
					/>
				)}
				{selectedPlayer && contextMenuPos && (() => {
					const manLink = activePlay?.manCoverageLinks?.find(
						(l) => l.defenderId === selectedPlayer.id
					);
					const linkedToPlayer = manLink
						? activePlay?.players.find((p) => p.id === manLink.receiverId)
						: null;
					return (
						<PlayerContextMenu
							selectedPlayer={selectedPlayer}
							contextMenuPos={contextMenuPos}
							onClose={closeContextMenu}
							onChangeLabel={(label) =>
								handlePlayerUpdate(selectedPlayer.id, { label })
							}
							onChangeColor={(color) =>
								handlePlayerUpdate(selectedPlayer.id, { color })
							}
							onChangeShape={(shape) =>
								handlePlayerUpdate(selectedPlayer.id, { shape })
							}
							onDelete={() => {
								handleErasePlayer(selectedPlayer.id);
								closeContextMenu();
							}}
							linkedToPlayer={linkedToPlayer ?? null}
							onAssignMan={() => {
								pendingManCoverageFromIdRef.current = selectedPlayer.id;
								setPendingManCoverageFromId(selectedPlayer.id);
								closeContextMenu();
							}}
							onRemoveMan={() => {
								handleRemoveManCoverageLink(selectedPlayer.id);
								closeContextMenu();
							}}
						/>
					);
				})()}
			</div>
		</div>
	);
}
