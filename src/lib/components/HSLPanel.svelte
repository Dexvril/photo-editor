<script>
	import { hslAdjustments } from '$lib/stores/editor.js';

	const channels = [
		{ key: 'reds', label: 'Reds', color: '#ef4444' },
		{ key: 'oranges', label: 'Oranges', color: '#f97316' },
		{ key: 'yellows', label: 'Yellows', color: '#eab308' },
		{ key: 'greens', label: 'Greens', color: '#22c55e' },
		{ key: 'cyans', label: 'Cyans', color: '#06b6d4' },
		{ key: 'blues', label: 'Blues', color: '#3b82f6' },
		{ key: 'magentas', label: 'Magentas', color: '#d946ef' },
	];

	let activeChannel = $state('reds');

	function reset() {
		hslAdjustments.update(hsl => {
			const copy = { ...hsl };
			copy[activeChannel] = { h: 0, s: 0, l: 0 };
			return copy;
		});
	}

	function resetAll() {
		const fresh = {};
		for (const ch of channels) fresh[ch.key] = { h: 0, s: 0, l: 0 };
		hslAdjustments.set(fresh);
	}
</script>

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">HSL Adjustment</h3>
		<button class="reset-btn" onclick={resetAll}>Reset All</button>
	</div>

	<div class="flex flex-wrap gap-1 mb-3">
		{#each channels as ch}
			<button
				class="ch-btn"
				class:active={activeChannel === ch.key}
				style="--ch-color: {ch.color}"
				onclick={() => activeChannel = ch.key}
			>
				<span class="ch-dot" style="background: {ch.color}"></span>
				{ch.label}
			</button>
		{/each}
	</div>

	<div class="slider-group">
		<div class="flex justify-between text-xs">
			<span>Hue</span>
			<span class="text-editor-muted">{$hslAdjustments[activeChannel].h}°</span>
		</div>
		<input type="range" min="-180" max="180" step="1" value={$hslAdjustments[activeChannel].h}
			oninput={(e) => hslAdjustments.update(h => ({ ...h, [activeChannel]: { ...h[activeChannel], h: +e.target.value } }))}
			class="w-full">
	</div>

	<div class="slider-group">
		<div class="flex justify-between text-xs">
			<span>Saturation</span>
			<span class="text-editor-muted">{$hslAdjustments[activeChannel].s}</span>
		</div>
		<input type="range" min="-100" max="100" step="1" value={$hslAdjustments[activeChannel].s}
			oninput={(e) => hslAdjustments.update(h => ({ ...h, [activeChannel]: { ...h[activeChannel], s: +e.target.value } }))}
			class="w-full">
	</div>

	<div class="slider-group">
		<div class="flex justify-between text-xs">
			<span>Lightness</span>
			<span class="text-editor-muted">{$hslAdjustments[activeChannel].l}</span>
		</div>
		<input type="range" min="-100" max="100" step="1" value={$hslAdjustments[activeChannel].l}
			oninput={(e) => hslAdjustments.update(h => ({ ...h, [activeChannel]: { ...h[activeChannel], l: +e.target.value } }))}
			class="w-full">
	</div>

	<button class="reset-btn mt-1" onclick={reset}>Reset {channels.find(c => c.key === activeChannel)?.label}</button>
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
	.ch-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0.25rem 0.375rem;
		font-size: 0.6875rem;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
	}
	.ch-btn:hover { border-color: var(--ch-color); }
	.ch-btn.active { border-color: var(--ch-color); background: var(--color-editor-hover); }
	.ch-dot { width: 8px; height: 8px; border-radius: 50%; }
	.slider-group { margin-bottom: 0.625rem; }
</style>
