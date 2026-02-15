<script>
	import { activeTool } from '$lib/stores/editor.js';

	const tools = [
		{ id: 'adjust', label: 'Adjust', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
		{ id: 'crop', label: 'Crop', icon: 'M7 3v4m0 0H3m4 0h10a2 2 0 012 2v10m0 0v4m0-4h4m-4 0H7a2 2 0 01-2-2V7' },
		{ id: 'text', label: 'Text', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
		{ id: 'filter', label: 'Filters', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
		{ id: 'hsl', label: 'HSL', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
		{ id: 'colorbalance', label: 'Balance', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
		{ id: 'curves', label: 'Curves', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
		{ id: 'colorreplace', label: 'Replace', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' },
		{ id: 'stickers', label: 'Stickers', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
	];
</script>

<div class="w-[72px] bg-editor-surface border-r border-editor-border flex flex-col py-2 shrink-0 overflow-y-auto">
	{#each tools as tool}
		<button
			class="sidebar-btn"
			class:active={$activeTool === tool.id}
			onclick={() => activeTool.set(tool.id)}
			title={tool.label}
		>
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d={tool.icon} />
			</svg>
			<span class="text-[10px]">{tool.label}</span>
		</button>
	{/each}
</div>

<style>
	.sidebar-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 0.5rem 0.25rem;
		margin: 1px 4px;
		border-radius: 0.375rem;
		color: var(--color-editor-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
	}
	.sidebar-btn:hover {
		color: var(--color-editor-text);
		background: var(--color-editor-panel);
	}
	.sidebar-btn.active {
		color: var(--color-editor-accent);
		background: var(--color-editor-panel);
	}
</style>
