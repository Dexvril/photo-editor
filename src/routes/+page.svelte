<script>
	import { onMount } from 'svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import AdjustPanel from '$lib/components/AdjustPanel.svelte';
	import CropPanel from '$lib/components/CropPanel.svelte';
	import TextPanel from '$lib/components/TextPanel.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import HSLPanel from '$lib/components/HSLPanel.svelte';
	import ColorBalancePanel from '$lib/components/ColorBalancePanel.svelte';
	import CurvesPanel from '$lib/components/CurvesPanel.svelte';
	import ColorReplacePanel from '$lib/components/ColorReplacePanel.svelte';
	import StickerPanel from '$lib/components/StickerPanel.svelte';
	import LayerPanel from '$lib/components/LayerPanel.svelte';
	import ExportModal from '$lib/components/ExportModal.svelte';

	import {
		originalImage, activeTool, adjustments, activeFilter, filterIntensity,
		hslAdjustments, colorBalance, curvesPoints, colorReplace,
		imageInfo, cropState, textLayers, stickers, zoom, panOffset,
		history, historyIndex, resetAll,
		layers, activeLayerId, addLayer,
		syncProxiesFromActiveLayer, syncProxiesToActiveLayer, isSyncingToLayer
	} from '$lib/stores/editor.js';
	import { renderToCanvas, compositeLayers } from '$lib/utils/canvas.js';
	import { pushState, undo as undoFn, redo as redoFn } from '$lib/utils/history.js';

	let mainCanvas = $state();
	let showExport = $state(false);
	let sourceImageData = $state(null);
	let isMobile = $state(false);
	let mobilePanel = $state(null); // null | 'tools' | 'layers'

	function updateIsMobile() {
		isMobile = window.innerWidth < 768;
	}

	onMount(() => {
		updateIsMobile();
	});

	// Debounce timer for live preview
	let renderTimer;

	function scheduleRender() {
		clearTimeout(renderTimer);
		renderTimer = setTimeout(() => render(), 30);
	}

	function render() {
		if (!mainCanvas || !sourceImageData) return;

		const currentLayers = $layers;

		if (currentLayers.length > 0) {
			// Multi-layer compositing — each layer uses its own adjustments
			compositeLayers(mainCanvas, currentLayers, sourceImageData);
		} else {
			// Fallback: single-pass (no layers yet)
			renderToCanvas(
				mainCanvas, sourceImageData,
				$adjustments, $activeFilter, $filterIntensity,
				$hslAdjustments, $colorBalance, $curvesPoints, $colorReplace
			);
		}
	}

	// Sync proxy stores to active layer when adjustment values change
	$effect(() => {
		// Touch all reactive adjustment values
		$adjustments; $activeFilter; $filterIntensity;
		$hslAdjustments; $colorBalance; $curvesPoints; $colorReplace;

		// Write current proxy values into the active layer
		syncProxiesToActiveLayer();
	});

	// Re-render when layers change (adjustments synced into layers trigger this)
	$effect(() => {
		$layers;
		scheduleRender();
	});

	// When active layer changes, load its adjustments into the proxy stores
	$effect(() => {
		$activeLayerId;
		syncProxiesFromActiveLayer();
	});

	function handleUpload(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				imageInfo.set({ width: img.width, height: img.height, name: file.name });
				originalImage.set(img);

				// Draw to offscreen canvas to get ImageData
				const offscreen = document.createElement('canvas');
				offscreen.width = img.width;
				offscreen.height = img.height;
				const ctx = offscreen.getContext('2d');
				ctx.drawImage(img, 0, 0);
				sourceImageData = ctx.getImageData(0, 0, img.width, img.height);

				// Reset adjustments
				resetAll();

				// Create background layer
				addLayer('image', 'Background', { imageData: sourceImageData }, { locked: true });

				// Initialize history
				history.set([sourceImageData]);
				historyIndex.set(0);

				// Center view
				panOffset.set({ x: 0, y: 0 });
				zoom.set(1);

				// Render
				render();
			};
			img.src = /** @type {string} */ (e.target.result);
		};
		reader.readAsDataURL(file);
	}

	/** Add a new image file as a layer (not replacing the background) */
	function addImageAsLayer(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				const offscreen = document.createElement('canvas');
				offscreen.width = img.width;
				offscreen.height = img.height;
				const ctx = offscreen.getContext('2d');
				ctx.drawImage(img, 0, 0);
				const imgData = ctx.getImageData(0, 0, img.width, img.height);

				const canvasW = $imageInfo.width;
				const canvasH = $imageInfo.height;

				let scale = 1;
				if (img.width > canvasW || img.height > canvasH) {
					scale = Math.min(canvasW / img.width, canvasH / img.height) * 0.8;
				}

				const layer = addLayer('image', file.name.replace(/\.[^.]+$/, ''), { imageData: imgData });

				// Center + scale the new layer
				layers.update(arr => arr.map(l => {
					if (l.id === layer.id) {
						const scaledW = img.width * scale;
						const scaledH = img.height * scale;
						return {
							...l,
							transform: {
								...l.transform,
								x: (canvasW - scaledW) / 2,
								y: (canvasH - scaledH) / 2,
								width: img.width,
								height: img.height,
								scaleX: scale,
								scaleY: scale,
								rotation: 0
							}
						};
					}
					return l;
				}));

				render();
			};
			img.src = /** @type {string} */ (e.target.result);
		};
		reader.readAsDataURL(file);
	}

	function saveToHistory() {
		if (!mainCanvas) return;
		const ctx = mainCanvas.getContext('2d');
		const data = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
		const result = pushState(/** @type {any[]} */ ($history), $historyIndex, data);
		history.set(result.history);
		historyIndex.set(result.index);
	}

	function handleUndo() {
		const result = undoFn(/** @type {any[]} */ ($history), $historyIndex);
		if (result) {
			historyIndex.set(result.index);
			sourceImageData = result.imageData;
			resetAll();
			addLayer('image', 'Background', { imageData: sourceImageData }, { locked: true });
			render();
		}
	}

	function handleRedo() {
		const result = redoFn(/** @type {any[]} */ ($history), $historyIndex);
		if (result) {
			historyIndex.set(result.index);
			sourceImageData = result.imageData;
			resetAll();
			addLayer('image', 'Background', { imageData: sourceImageData }, { locked: true });
			render();
		}
	}

	function handleCropApply() {
		if (!mainCanvas || !sourceImageData) return;
		const { x, y, width, height } = $cropState;
		if (width <= 0 || height <= 0) return;

		render();

		const ctx = mainCanvas.getContext('2d');
		const cropped = ctx.getImageData(x, y, width, height);
		sourceImageData = cropped;
		imageInfo.update(info => ({ ...info, width, height }));
		cropState.update(c => ({ ...c, active: false }));
		resetAll();
		addLayer('image', 'Background', { imageData: sourceImageData }, { locked: true });
		render();
		saveToHistory();
	}

	function handleRotate(degrees) {
		if (!mainCanvas || !sourceImageData) return;
		render();

		const ctx = mainCanvas.getContext('2d');
		const currentData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
		const { width, height } = currentData;

		const offscreen = document.createElement('canvas');
		const offCtx = offscreen.getContext('2d');

		if (degrees === 90 || degrees === -90) {
			offscreen.width = height;
			offscreen.height = width;
			offCtx.translate(offscreen.width / 2, offscreen.height / 2);
			offCtx.rotate((degrees * Math.PI) / 180);
			offCtx.drawImage(mainCanvas, -width / 2, -height / 2);
			imageInfo.update(info => ({ ...info, width: height, height: width }));
		} else {
			offscreen.width = width;
			offscreen.height = height;
			offCtx.translate(width / 2, height / 2);
			offCtx.rotate((degrees * Math.PI) / 180);
			offCtx.drawImage(mainCanvas, -width / 2, -height / 2);
		}

		sourceImageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
		resetAll();
		addLayer('image', 'Background', { imageData: sourceImageData }, { locked: true });
		render();
		saveToHistory();
	}

	function handleFlip(direction) {
		if (!mainCanvas || !sourceImageData) return;
		render();

		const { width, height } = mainCanvas;

		const offscreen = document.createElement('canvas');
		offscreen.width = width;
		offscreen.height = height;
		const offCtx = offscreen.getContext('2d');

		if (direction === 'h') {
			offCtx.translate(width, 0);
			offCtx.scale(-1, 1);
		} else {
			offCtx.translate(0, height);
			offCtx.scale(1, -1);
		}
		offCtx.drawImage(mainCanvas, 0, 0);

		sourceImageData = offCtx.getImageData(0, 0, width, height);
		resetAll();
		addLayer('image', 'Background', { imageData: sourceImageData }, { locked: true });
		render();
		saveToHistory();
	}

	function handleExport({ format, quality, width, height }) {
		if (!mainCanvas) return;

		const exportCanvas = document.createElement('canvas');
		exportCanvas.width = width;
		exportCanvas.height = height;
		const ctx = exportCanvas.getContext('2d');

		const currentLayers = $layers;

		if (currentLayers.length > 0) {
			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = mainCanvas.width;
			tempCanvas.height = mainCanvas.height;
			compositeLayers(tempCanvas, currentLayers, sourceImageData);
			ctx.drawImage(tempCanvas, 0, 0, width, height);
		} else {
			ctx.drawImage(mainCanvas, 0, 0, width, height);
		}

		const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
		const q = format === 'jpeg' ? quality / 100 : undefined;

		exportCanvas.toBlob((blob) => {
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `edited-image.${format === 'jpeg' ? 'jpg' : 'png'}`;
			a.click();
			URL.revokeObjectURL(url);
		}, mimeType, q);

		showExport = false;
	}

	// Keyboard shortcuts
	function handleKeydown(e) {
		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
			if (e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
			if (e.key === 'y') { e.preventDefault(); handleRedo(); }
			if (e.key === 'e') { e.preventDefault(); showExport = true; }
		}
	}

	// Drag & drop — if image already loaded, add as new layer; otherwise load as background
	function handleDrop(e) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) {
			if (sourceImageData) {
				// Already have an image — add as new layer
				addImageAsLayer(file);
			} else {
				handleUpload(file);
			}
		}
	}

	function handleDragOver(e) {
		e.preventDefault();
	}

	// Commit changes (save current state to history) on tool switch
	let prevTool = $state('adjust');
	$effect(() => {
		const tool = $activeTool;
		if (prevTool !== tool && sourceImageData && mainCanvas) {
			saveToHistory();
		}
		prevTool = tool;
	});
</script>

<svelte:window onkeydown={handleKeydown} onresize={updateIsMobile} />

<div
	class="flex flex-col h-full"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	role="application"
	aria-label="Photo Editor"
>
	<Toolbar
		onupload={handleUpload}
		onaddimage={addImageAsLayer}
		onundo={handleUndo}
		onredo={handleRedo}
		onexport={() => showExport = true}
		{isMobile}
	/>

	{#if isMobile}
		<!-- Mobile Layout -->
		<div class="flex flex-col flex-1 min-h-0 relative">
			<Canvas bind:canvas={mainCanvas} />

			<!-- Mobile panel drawer toggle -->
			<button
				class="mobile-panel-toggle"
				onclick={() => mobilePanel = mobilePanel ? null : 'tools'}
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
				</svg>
				{mobilePanel ? 'Close' : 'Settings'}
			</button>

			<!-- Mobile slide-up drawer -->
			{#if mobilePanel}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="mobile-drawer-overlay" onclick={() => mobilePanel = null} onkeydown={() => {}}>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="mobile-drawer" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
						<div class="mobile-drawer-handle"></div>
						<div class="mobile-drawer-tabs">
							<button
								class="mobile-tab"
								class:active={mobilePanel === 'tools'}
								onclick={() => mobilePanel = 'tools'}
							>Tools</button>
							<button
								class="mobile-tab"
								class:active={mobilePanel === 'layers'}
								onclick={() => mobilePanel = 'layers'}
							>Layers</button>
						</div>
						<div class="mobile-drawer-content">
							{#if mobilePanel === 'tools'}
								{#if $activeTool === 'adjust'}
									<AdjustPanel />
								{:else if $activeTool === 'crop'}
									<CropPanel
										onapply={handleCropApply}
										onrotate={handleRotate}
										onflip={handleFlip}
									/>
								{:else if $activeTool === 'text'}
									<TextPanel />
								{:else if $activeTool === 'filter'}
									<FilterPanel />
								{:else if $activeTool === 'hsl'}
									<HSLPanel />
								{:else if $activeTool === 'colorbalance'}
									<ColorBalancePanel />
								{:else if $activeTool === 'curves'}
									<CurvesPanel />
								{:else if $activeTool === 'colorreplace'}
									<ColorReplacePanel />
								{:else if $activeTool === 'stickers'}
									<StickerPanel />
								{/if}
							{:else if mobilePanel === 'layers'}
								<LayerPanel onaddimage={addImageAsLayer} />
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Mobile bottom sidebar (horizontal tools) -->
			<Sidebar {isMobile} />
		</div>
	{:else}
		<!-- Desktop Layout -->
		<div class="flex flex-1 min-h-0">
			<Sidebar />

			<Canvas bind:canvas={mainCanvas} />

			<!-- Right Panel -->
			<div class="w-[260px] bg-editor-surface border-l border-editor-border flex flex-col shrink-0">
				<!-- Tool Panel -->
				<div class="flex-1 overflow-y-auto min-h-0">
					{#if $activeTool === 'adjust'}
						<AdjustPanel />
					{:else if $activeTool === 'crop'}
						<CropPanel
							onapply={handleCropApply}
							onrotate={handleRotate}
							onflip={handleFlip}
						/>
					{:else if $activeTool === 'text'}
						<TextPanel />
					{:else if $activeTool === 'filter'}
						<FilterPanel />
					{:else if $activeTool === 'hsl'}
						<HSLPanel />
					{:else if $activeTool === 'colorbalance'}
						<ColorBalancePanel />
					{:else if $activeTool === 'curves'}
						<CurvesPanel />
					{:else if $activeTool === 'colorreplace'}
						<ColorReplacePanel />
					{:else if $activeTool === 'stickers'}
						<StickerPanel />
					{/if}
				</div>
				<!-- Layer Panel (always visible) -->
				<div class="border-t border-editor-border overflow-y-auto" style="max-height: 45%;">
					<LayerPanel onaddimage={addImageAsLayer} />
				</div>
			</div>
		</div>

		<!-- Status bar -->
		<div class="flex items-center justify-between px-4 py-1 bg-editor-surface border-t border-editor-border text-xs text-editor-muted shrink-0">
			<span>
				{#if $originalImage}
					{$imageInfo.width} &times; {$imageInfo.height}px
				{:else}
					No image loaded
				{/if}
			</span>
			<span>Layers: {$layers.length}</span>
			<span>Zoom: {Math.round($zoom * 100)}%</span>
			<span>Ctrl+Z / Ctrl+Shift+Z: Undo/Redo &middot; Ctrl+E: Export</span>
		</div>
	{/if}
</div>

{#if showExport}
	<ExportModal
		onclose={() => showExport = false}
		onexport={handleExport}
	/>
{/if}

<style>
	.mobile-panel-toggle {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		background: var(--color-editor-surface);
		color: var(--color-editor-text);
		border: 1px solid var(--color-editor-border);
		cursor: pointer;
		opacity: 0.9;
		backdrop-filter: blur(4px);
	}
	.mobile-panel-toggle:active { opacity: 1; background: var(--color-editor-hover); }

	.mobile-drawer-overlay {
		position: absolute;
		inset: 0;
		z-index: 30;
		background: rgba(0,0,0,0.3);
	}

	.mobile-drawer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		max-height: 60%;
		background: var(--color-editor-surface);
		border-top: 1px solid var(--color-editor-border);
		border-radius: 1rem 1rem 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.mobile-drawer-handle {
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background: var(--color-editor-border);
		margin: 0.5rem auto;
		flex-shrink: 0;
	}

	.mobile-drawer-tabs {
		display: flex;
		border-bottom: 1px solid var(--color-editor-border);
		flex-shrink: 0;
	}

	.mobile-tab {
		flex: 1;
		padding: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
		background: none;
		border: none;
		color: var(--color-editor-muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
	}
	.mobile-tab.active {
		color: var(--color-editor-accent);
		border-bottom-color: var(--color-editor-accent);
	}

	.mobile-drawer-content {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
</style>
