<script>
	import { curvesPoints } from '$lib/stores/editor.js';
	import { buildCurveLUT } from '$lib/utils/curves.js';

	const size = 200;
	let activeChannel = $state('rgb');
	let draggingPoint = $state(-1);
	let svgEl;

	const channelColors = {
		rgb: '#ffffff',
		r: '#ef4444',
		g: '#22c55e',
		b: '#3b82f6'
	};

	const channels = [
		{ key: 'rgb', label: 'RGB' },
		{ key: 'r', label: 'R' },
		{ key: 'g', label: 'G' },
		{ key: 'b', label: 'B' },
	];

	function toSVG(point) {
		return { x: point.x / 255 * size, y: size - point.y / 255 * size };
	}

	function fromSVG(sx, sy) {
		return {
			x: Math.max(0, Math.min(255, Math.round(sx / size * 255))),
			y: Math.max(0, Math.min(255, Math.round((size - sy) / size * 255)))
		};
	}

	function getPathD(points) {
		const lut = buildCurveLUT(points);
		let d = '';
		for (let i = 0; i < 256; i++) {
			const sx = i / 255 * size;
			const sy = size - lut[i] / 255 * size;
			d += (i === 0 ? 'M' : 'L') + `${sx},${sy}`;
		}
		return d;
	}

	function handleMouseDown(e, i) {
		if (i === 0 || i === $curvesPoints[activeChannel].length - 1) return; // Don't drag endpoints
		draggingPoint = i;
		e.preventDefault();
	}

	function handleSVGMouseDown(e) {
		if (draggingPoint >= 0) return;
		const rect = svgEl.getBoundingClientRect();
		const sx = e.clientX - rect.left;
		const sy = e.clientY - rect.top;
		const pt = fromSVG(sx, sy);

		curvesPoints.update(c => {
			const pts = [...c[activeChannel], pt].sort((a, b) => a.x - b.x);
			return { ...c, [activeChannel]: pts };
		});
	}

	function handleMouseMove(e) {
		if (draggingPoint < 0) return;
		const rect = svgEl.getBoundingClientRect();
		const sx = e.clientX - rect.left;
		const sy = e.clientY - rect.top;
		const pt = fromSVG(sx, sy);

		curvesPoints.update(c => {
			const pts = [...c[activeChannel]];
			pts[draggingPoint] = pt;
			return { ...c, [activeChannel]: pts };
		});
	}

	function handleMouseUp() {
		draggingPoint = -1;
	}

	function handleDblClick(e, i) {
		if (i === 0 || i === $curvesPoints[activeChannel].length - 1) return;
		curvesPoints.update(c => {
			const pts = [...c[activeChannel]];
			pts.splice(i, 1);
			return { ...c, [activeChannel]: pts };
		});
	}

	function reset() {
		curvesPoints.update(c => ({
			...c,
			[activeChannel]: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
		}));
	}

	function resetAll() {
		curvesPoints.set({
			rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
			r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
			g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
			b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
		});
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">Curves</h3>
		<button class="reset-btn" onclick={resetAll}>Reset All</button>
	</div>

	<div class="flex gap-1 mb-3">
		{#each channels as ch}
			<button
				class="ch-btn"
				class:active={activeChannel === ch.key}
				style="--ch-color: {channelColors[ch.key]}"
				onclick={() => activeChannel = ch.key}
			>{ch.label}</button>
		{/each}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svg
		bind:this={svgEl}
		width={size}
		height={size}
		class="curves-graph"
		onmousedown={handleSVGMouseDown}
	>
		<!-- Grid -->
		{#each [0.25, 0.5, 0.75] as frac}
			<line x1={frac * size} y1="0" x2={frac * size} y2={size} stroke="#333" stroke-width="0.5" />
			<line x1="0" y1={frac * size} x2={size} y2={frac * size} stroke="#333" stroke-width="0.5" />
		{/each}

		<!-- Diagonal reference -->
		<line x1="0" y1={size} x2={size} y2="0" stroke="#555" stroke-width="0.5" stroke-dasharray="4" />

		<!-- Curve path -->
		<path d={getPathD($curvesPoints[activeChannel])} fill="none" stroke={channelColors[activeChannel]} stroke-width="2" />

		<!-- Control points -->
		{#each $curvesPoints[activeChannel] as point, i}
			{@const svgPt = toSVG(point)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<circle
				cx={svgPt.x}
				cy={svgPt.y}
				r="5"
				fill={i === 0 || i === $curvesPoints[activeChannel].length - 1 ? '#666' : channelColors[activeChannel]}
				stroke="white"
				stroke-width="1"
				class="cursor-pointer"
				onmousedown={(e) => handleMouseDown(e, i)}
				ondblclick={(e) => handleDblClick(e, i)}
			/>
		{/each}
	</svg>

	<p class="text-[10px] text-editor-muted mt-2">Click to add point. Double-click to remove. Drag to adjust.</p>
	<button class="reset-btn mt-1" onclick={reset}>Reset {channels.find(c => c.key === activeChannel)?.label.toUpperCase()}</button>
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
		flex: 1;
		padding: 0.25rem;
		font-size: 0.6875rem;
		border-radius: 0.25rem;
		background: var(--color-editor-panel);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
		text-align: center;
	}
	.ch-btn:hover { border-color: var(--ch-color); }
	.ch-btn.active { border-color: var(--ch-color); background: var(--color-editor-hover); }
	.curves-graph {
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.375rem;
		display: block;
		width: 100%;
		height: auto;
	}
</style>
