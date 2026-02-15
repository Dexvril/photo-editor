<script>
	import { activeFilter, filterIntensity } from '$lib/stores/editor.js';
	import { filterPresets } from '$lib/utils/filters.js';

	const presetKeys = Object.keys(filterPresets);
</script>

<div class="panel">
	<h3 class="panel-title mb-3">Filters</h3>

	<div class="grid grid-cols-3 gap-2 mb-3">
		{#each presetKeys as key}
			<button
				class="filter-btn"
				class:active={$activeFilter === key}
				onclick={() => activeFilter.set(key)}
			>
				<div class="filter-preview" class:grayscale={key === 'grayscale'} class:sepia={key === 'sepia'}></div>
				<span>{filterPresets[key].name}</span>
			</button>
		{/each}
	</div>

	{#if $activeFilter !== 'none'}
		<div class="slider-group">
			<div class="flex justify-between text-xs">
				<span>Intensity</span>
				<span class="text-editor-muted">{$filterIntensity}%</span>
			</div>
			<input type="range" min="0" max="100" step="1" bind:value={$filterIntensity} class="w-full">
		</div>
	{/if}
</div>

<style>
	.panel { padding: 0.75rem; }
	.panel-title { font-size: 0.875rem; font-weight: 600; }
	.filter-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 0.375rem;
		border-radius: 0.375rem;
		background: var(--color-editor-panel);
		border: 2px solid transparent;
		color: var(--color-editor-text);
		font-size: 0.625rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.filter-btn:hover { border-color: var(--color-editor-border); }
	.filter-btn.active { border-color: var(--color-editor-accent); }
	.filter-preview {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 0.25rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
	.filter-preview.grayscale { filter: grayscale(1); }
	.filter-preview.sepia { filter: sepia(1); }
	.slider-group { margin-bottom: 0.5rem; }
</style>
