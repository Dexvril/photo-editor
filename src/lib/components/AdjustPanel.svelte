<script>
	import { adjustments } from '$lib/stores/editor.js';

	const sliders = [
		{ key: 'brightness', label: 'Brightness', min: -100, max: 100 },
		{ key: 'contrast', label: 'Contrast', min: -100, max: 100 },
		{ key: 'saturation', label: 'Saturation', min: -100, max: 100 },
		{ key: 'exposure', label: 'Exposure', min: -100, max: 100 },
		{ key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
		{ key: 'blur', label: 'Blur', min: 0, max: 10 },
		{ key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
	];

	function reset() {
		adjustments.set({
			brightness: 0, contrast: 0, saturation: 0,
			exposure: 0, blur: 0, sharpen: 0, vibrance: 0
		});
	}
</script>

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">Adjustments</h3>
		<button class="reset-btn" onclick={reset}>Reset</button>
	</div>

	{#each sliders as s}
		<div class="slider-group">
			<div class="flex justify-between text-xs">
				<span>{s.label}</span>
				<span class="text-editor-muted">{$adjustments[s.key]}</span>
			</div>
			<input
				type="range"
				min={s.min}
				max={s.max}
				step="1"
				bind:value={$adjustments[s.key]}
				class="w-full"
			>
		</div>
	{/each}
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
	.slider-group { margin-bottom: 0.625rem; }
</style>
