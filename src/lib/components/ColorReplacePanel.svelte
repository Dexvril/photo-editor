<script>
	import { colorReplace } from '$lib/stores/editor.js';

	function reset() {
		colorReplace.set({ sourceColor: '#ff0000', targetColor: '#0000ff', tolerance: 30 });
	}
</script>

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">Color Replace</h3>
		<button class="reset-btn" onclick={reset}>Reset</button>
	</div>

	<div class="mb-3">
		<p class="text-xs text-editor-muted mb-1">Source Color (to replace)</p>
		<div class="flex items-center gap-2">
			<input type="color" bind:value={$colorReplace.sourceColor} class="color-input">
			<span class="text-xs font-mono">{$colorReplace.sourceColor}</span>
		</div>
	</div>

	<div class="mb-3">
		<p class="text-xs text-editor-muted mb-1">Target Color (replace with)</p>
		<div class="flex items-center gap-2">
			<input type="color" bind:value={$colorReplace.targetColor} class="color-input">
			<span class="text-xs font-mono">{$colorReplace.targetColor}</span>
		</div>
	</div>

	<div class="slider-group">
		<div class="flex justify-between text-xs">
			<span>Tolerance</span>
			<span class="text-editor-muted">{$colorReplace.tolerance}</span>
		</div>
		<input type="range" min="0" max="100" step="1" bind:value={$colorReplace.tolerance} class="w-full">
	</div>

	<p class="text-[10px] text-editor-muted">Higher tolerance matches more similar colors. Set to 0 to disable.</p>
</div>

<style>
	.panel { padding: 0.75rem; }
	.panel-title { font-size: 0.875rem; font-weight: 600; }
	.reset-btn {
		font-size: 0.6875rem;
		color: var(--color-editor-accent);
		background: none;
		border: none;
		cursor: pointer;
	}
	.reset-btn:hover { text-decoration: underline; }
	.color-input {
		width: 36px; height: 36px;
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		background: none;
		cursor: pointer;
		padding: 2px;
	}
	.slider-group { margin-bottom: 0.625rem; }
</style>
