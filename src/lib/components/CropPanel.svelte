<script>
	import { cropState, imageInfo } from '$lib/stores/editor.js';

	let { onapply, onrotate, onflip } = $props();

	const ratios = [
		{ label: 'Free', value: 'free' },
		{ label: '1:1', value: '1:1' },
		{ label: '4:3', value: '4:3' },
		{ label: '3:2', value: '3:2' },
		{ label: '16:9', value: '16:9' },
		{ label: 'A4 Portrait', value: '210:297' },
		{ label: 'A4 Landscape', value: '297:210' },
	];

	function setRatio(ratioStr) {
		cropState.update(c => {
			c.ratio = ratioStr;
			if (ratioStr === 'free') return { ...c, active: true };

			const [rw, rh] = ratioStr.split(':').map(Number);
			const aspectRatio = rw / rh;
			const imgW = $imageInfo.width;
			const imgH = $imageInfo.height;

			let cropW, cropH;
			if (imgW / imgH > aspectRatio) {
				cropH = imgH;
				cropW = cropH * aspectRatio;
			} else {
				cropW = imgW;
				cropH = cropW / aspectRatio;
			}

			return {
				...c,
				active: true,
				x: Math.round((imgW - cropW) / 2),
				y: Math.round((imgH - cropH) / 2),
				width: Math.round(cropW),
				height: Math.round(cropH)
			};
		});
	}

	function startCrop() {
		cropState.update(c => ({
			...c,
			active: true,
			x: 0, y: 0,
			width: $imageInfo.width,
			height: $imageInfo.height
		}));
	}

	function applyCrop() {
		onapply();
	}

	function cancelCrop() {
		cropState.update(c => ({ ...c, active: false }));
	}

	let resizeWidth = $state($imageInfo.width);
	let resizeHeight = $state($imageInfo.height);
	let lockAspect = $state(true);

	function onWidthChange() {
		if (lockAspect && $imageInfo.width) {
			resizeHeight = Math.round(resizeWidth * $imageInfo.height / $imageInfo.width);
		}
	}

	function onHeightChange() {
		if (lockAspect && $imageInfo.height) {
			resizeWidth = Math.round(resizeHeight * $imageInfo.width / $imageInfo.height);
		}
	}
</script>

<div class="panel">
	<h3 class="panel-title mb-3">Crop & Transform</h3>

	<!-- Crop ratios -->
	<div class="mb-4">
		<p class="text-xs text-editor-muted mb-2">Aspect Ratio</p>
		<div class="flex flex-wrap gap-1">
			{#each ratios as ratio}
				<button
					class="ratio-btn"
					class:active={$cropState.ratio === ratio.value && $cropState.active}
					onclick={() => setRatio(ratio.value)}
				>{ratio.label}</button>
			{/each}
		</div>
	</div>

	{#if $cropState.active}
		<div class="flex flex-col gap-2 mb-4">
			<div class="grid grid-cols-2 gap-2 text-xs">
				<label>X: <input type="number" bind:value={$cropState.x} class="num-input"></label>
				<label>Y: <input type="number" bind:value={$cropState.y} class="num-input"></label>
				<label>W: <input type="number" bind:value={$cropState.width} class="num-input"></label>
				<label>H: <input type="number" bind:value={$cropState.height} class="num-input"></label>
			</div>
			<div class="flex gap-2">
				<button class="action-btn flex-1" onclick={applyCrop}>Apply Crop</button>
				<button class="action-btn cancel flex-1" onclick={cancelCrop}>Cancel</button>
			</div>
		</div>
	{:else}
		<button class="action-btn w-full mb-4" onclick={startCrop}>Start Crop</button>
	{/if}

	<div class="border-t border-editor-border pt-3 mb-3">
		<p class="text-xs text-editor-muted mb-2">Rotate</p>
		<div class="flex gap-1">
			<button class="action-btn flex-1" onclick={() => onrotate(-90)}>-90°</button>
			<button class="action-btn flex-1" onclick={() => onrotate(90)}>+90°</button>
			<button class="action-btn flex-1" onclick={() => onrotate(180)}>180°</button>
		</div>
	</div>

	<div class="border-t border-editor-border pt-3">
		<p class="text-xs text-editor-muted mb-2">Flip</p>
		<div class="flex gap-1">
			<button class="action-btn flex-1" onclick={() => onflip('h')}>Horizontal</button>
			<button class="action-btn flex-1" onclick={() => onflip('v')}>Vertical</button>
		</div>
	</div>
</div>

<style>
	.panel { padding: 0.75rem; }
	.panel-title { font-size: 0.875rem; font-weight: 600; }
	.ratio-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
	}
	.ratio-btn:hover { background: var(--color-editor-hover); }
	.ratio-btn.active { background: var(--color-editor-accent); border-color: var(--color-editor-accent); }
	.num-input {
		width: 100%;
		padding: 0.25rem;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
		font-size: 0.75rem;
		margin-top: 2px;
	}
	.action-btn {
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		background: var(--color-editor-accent);
		color: white;
		border: none;
		cursor: pointer;
	}
	.action-btn:hover { opacity: 0.9; }
	.action-btn.cancel { background: var(--color-editor-panel); border: 1px solid var(--color-editor-border); }
</style>
