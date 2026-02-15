<script>
	import { colorBalance } from '$lib/stores/editor.js';

	const tones = [
		{ key: 'shadows', label: 'Shadows' },
		{ key: 'midtones', label: 'Midtones' },
		{ key: 'highlights', label: 'Highlights' },
	];

	const sliders = [
		{ key: 'cyan_red', left: 'Cyan', right: 'Red' },
		{ key: 'magenta_green', left: 'Magenta', right: 'Green' },
		{ key: 'yellow_blue', left: 'Yellow', right: 'Blue' },
	];

	let activeTone = $state('midtones');

	function reset() {
		colorBalance.update(cb => ({
			...cb,
			[activeTone]: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 }
		}));
	}

	function resetAll() {
		colorBalance.set({
			shadows: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
			midtones: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
			highlights: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 }
		});
	}
</script>

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">Color Balance</h3>
		<button class="reset-btn" onclick={resetAll}>Reset All</button>
	</div>

	<div class="flex gap-1 mb-3">
		{#each tones as tone}
			<button
				class="tone-btn"
				class:active={activeTone === tone.key}
				onclick={() => activeTone = tone.key}
			>{tone.label}</button>
		{/each}
	</div>

	{#each sliders as s}
		<div class="slider-group">
			<div class="flex justify-between text-xs">
				<span class="text-editor-muted">{s.left}</span>
				<span>{$colorBalance[activeTone][s.key]}</span>
				<span class="text-editor-muted">{s.right}</span>
			</div>
			<input type="range" min="-100" max="100" step="1" value={$colorBalance[activeTone][s.key]}
				oninput={(e) => colorBalance.update(cb => ({
					...cb,
					[activeTone]: { ...cb[activeTone], [s.key]: +e.target.value }
				}))}
				class="w-full">
		</div>
	{/each}

	<button class="reset-btn" onclick={reset}>Reset {tones.find(t => t.key === activeTone)?.label}</button>
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
	.tone-btn {
		flex: 1;
		padding: 0.25rem 0.375rem;
		font-size: 0.6875rem;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
		text-align: center;
	}
	.tone-btn:hover { background: var(--color-editor-hover); }
	.tone-btn.active { background: var(--color-editor-accent); border-color: var(--color-editor-accent); }
	.slider-group { margin-bottom: 0.75rem; }
</style>
