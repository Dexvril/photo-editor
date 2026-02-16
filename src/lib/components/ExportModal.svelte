<script>
	import { imageInfo } from '$lib/stores/editor.js';

	let { onclose, onexport } = $props();

	let format = $state('png');
	let quality = $state(92);
	let exportWidth = $state($imageInfo.width);
	let exportHeight = $state($imageInfo.height);
	let lockAspect = $state(true);

	function onWidthInput(e) {
		exportWidth = +e.target.value;
		if (lockAspect && $imageInfo.width) {
			exportHeight = Math.round(exportWidth * $imageInfo.height / $imageInfo.width);
		}
	}

	function onHeightInput(e) {
		exportHeight = +e.target.value;
		if (lockAspect && $imageInfo.height) {
			exportWidth = Math.round(exportHeight * $imageInfo.width / $imageInfo.height);
		}
	}

	function doExport() {
		onexport({ format, quality, width: exportWidth, height: exportHeight });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()}>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold">Export Image</h2>
			<button class="close-btn" onclick={onclose}>&times;</button>
		</div>

		<div class="mb-4">
			<p class="text-xs text-editor-muted mb-1">Format</p>
			<div class="flex gap-2">
				<button class="format-btn" class:active={format==='png'} onclick={() => format='png'}>PNG</button>
				<button class="format-btn" class:active={format==='jpeg'} onclick={() => format='jpeg'}>JPEG</button>
			</div>
		</div>

		{#if format === 'jpeg'}
			<div class="mb-4">
				<div class="flex justify-between text-xs mb-1">
					<span>Quality</span>
					<span class="text-editor-muted">{quality}%</span>
				</div>
				<input type="range" min="1" max="100" step="1" bind:value={quality} class="w-full">
			</div>
		{/if}

		<div class="mb-4">
			<p class="text-xs text-editor-muted mb-1">Dimensions</p>
			<div class="flex gap-2 items-center">
				<input type="number" value={exportWidth} class="dim-input" oninput={onWidthInput}>
				<span class="text-editor-muted text-xs">&times;</span>
				<input type="number" value={exportHeight} class="dim-input" oninput={onHeightInput}>
				<label class="flex items-center gap-1 text-xs">
					<input type="checkbox" bind:checked={lockAspect}> Lock
				</label>
			</div>
		</div>

		<button class="export-btn w-full" onclick={doExport}>
			Download {format.toUpperCase()}
		</button>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal {
		background: var(--color-editor-surface);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.5rem;
		padding: 1.5rem;
		min-width: min(320px, 90vw);
		max-width: min(400px, 95vw);
		width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
	}
	@media (min-width: 768px) {
		.modal {
			width: auto;
		}
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--color-editor-muted);
		font-size: 1.25rem;
		cursor: pointer;
	}
	.format-btn {
		flex: 1;
		padding: 0.5rem;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 2px solid var(--color-editor-border);
		cursor: pointer;
		font-weight: 600;
	}
	.format-btn.active {
		border-color: var(--color-editor-accent);
		background: var(--color-editor-hover);
	}
	.dim-input {
		width: 80px;
		padding: 0.375rem;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
		font-size: 0.8125rem;
	}
	.export-btn {
		padding: 0.625rem;
		border-radius: 0.375rem;
		background: var(--color-editor-accent);
		color: white;
		border: none;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.875rem;
	}
	.export-btn:hover { opacity: 0.9; }
</style>
