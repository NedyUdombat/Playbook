import React from "react";

interface EmptyStateProps {
	hasNoPlays: boolean;
	onCreatePlay: () => void;
}

export function EmptyState({ hasNoPlays, onCreatePlay }: EmptyStateProps) {
	return (
		<div className="empty-state">
			<div className="empty-icon">◈</div>
			{hasNoPlays ? (
				<>
					<div className="empty-title">NO PLAYS YET</div>
					<div className="empty-sub">
						<button className="empty-create-btn" onClick={onCreatePlay}>
							Create your first play
						</button>
					</div>
				</>
			) : (
				<>
					<div className="empty-title">NO PLAY SELECTED</div>
					<div className="empty-sub">
						Create a play in the sidebar to get started
					</div>
				</>
			)}
		</div>
	);
}
