<script>
	import { zoom, canUndo, canRedo, imageInfo, originalImage } from '$lib/stores/editor.js';
	import { pushState, undo as undoFn, redo as redoFn } from '$lib/utils/history.js';
	import { history, historyIndex } from '$lib/stores/editor.js';

	let { onupload, onaddimage, onundo, onredo, onexport, isMobile = false } = $props();
	let fileInput;

	function handleFile(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		if ($originalImage && onaddimage) {
			// Already have an image — add as new layer
			onaddimage(file);
		} else {
			onupload(file);
		}
	}

	function zoomIn() { zoom.update(z => Math.min(5, z + 0.25)); }
	function zoomOut() { zoom.update(z => Math.max(0.1, z - 0.25)); }
	function zoomFit() { zoom.set(1); }
</script>

<div class="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-editor-surface border-b border-editor-border shrink-0 overflow-x-auto">
	<input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={handleFile}>

	<button class="btn" onclick={() => fileInput.click()} title="Upload">
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
		</svg>
		{#if !isMobile}Upload{/if}
	</button>

	<div class="w-px h-6 bg-editor-border shrink-0"></div>

	<button class="btn" onclick={onundo} disabled={!$canUndo} title="Undo">
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/>
		</svg>
		{#if !isMobile}Undo{/if}
	</button>

	<button class="btn" onclick={onredo} disabled={!$canRedo} title="Redo">
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path d="M21 10H11a5 5 0 00-5 5v2m16-7l-4-4m4 4l-4 4"/>
		</svg>
		{#if !isMobile}Redo{/if}
	</button>

	<div class="w-px h-6 bg-editor-border shrink-0"></div>

	<button class="btn-sm" onclick={zoomOut}>-</button>
	<span class="text-xs text-editor-muted min-w-[2.5rem] text-center">{Math.round($zoom * 100)}%</span>
	<button class="btn-sm" onclick={zoomIn}>+</button>
	<button class="btn-sm" onclick={zoomFit}>Fit</button>

	<div class="flex-1"></div>

	{#if !isMobile && $imageInfo.name}
		<span class="text-xs text-editor-muted">
			{$imageInfo.name} &middot; {$imageInfo.width}x{$imageInfo.height}
		</span>
	{/if}

	<button class="btn btn-accent" onclick={onexport} disabled={!$originalImage} title="Export">
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
		</svg>
		{#if !isMobile}Export{/if}
	</button>
</div>

<style>
	.btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn:hover:not(:disabled) { background: var(--color-editor-hover); }
	.btn:disabled { opacity: 0.4; cursor: default; }
	.btn-accent {
		background: var(--color-editor-accent);
		border-color: var(--color-editor-accent);
	}
	.btn-accent:hover:not(:disabled) { background: #d63a52; }
	.btn-sm {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
	}
	.btn-sm:hover { background: var(--color-editor-hover); }
</style>
