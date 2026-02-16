<script>
	import { zoom, panOffset, originalImage, layers, textLayers, stickers, cropState, activeLayerId, updateLayerData, updateLayerTransform } from '$lib/stores/editor.js';

	let { canvas = $bindable() } = $props();
	let containerEl;
	let isPanning = false;
	let lastMouse = { x: 0, y: 0 };

	// Drag state for text layers and stickers
	let dragging = null; // { type: 'text'|'sticker', layerId, index }
	let dragStart = { x: 0, y: 0 };

	// Image layer interaction state
	let layerInteraction = $state(null); // { mode: 'move'|'resize'|'rotate', layerId, ... }
	let interactionStart = { mx: 0, my: 0, origTransform: null, handle: null };

	// Handle size in canvas coords
	const HANDLE_SIZE = 8;
	const ROTATION_HANDLE_OFFSET = 24;

	function handleWheel(e) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		zoom.update(z => Math.max(0.1, Math.min(5, z + delta)));
	}

	function getCanvasCoords(e) {
		const rect = containerEl.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left - $panOffset.x) / $zoom,
			y: (e.clientY - rect.top - $panOffset.y) / $zoom
		};
	}

	function getLayerBounds(layer) {
		if (!layer.transform) return null;
		const t = layer.transform;
		const w = t.width * t.scaleX;
		const h = t.height * t.scaleY;
		return { x: t.x, y: t.y, w, h, rotation: t.rotation };
	}

	function pointInRotatedRect(px, py, rx, ry, rw, rh, rotation) {
		// Transform point into rect's local space
		const cx = rx + rw / 2;
		const cy = ry + rh / 2;
		const rad = -rotation * Math.PI / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const dx = px - cx;
		const dy = py - cy;
		const lx = dx * cos - dy * sin + rw / 2;
		const ly = dx * sin + dy * cos + rh / 2;
		return lx >= 0 && lx <= rw && ly >= 0 && ly <= rh;
	}

	function hitTestHandle(mx, my, bounds) {
		if (!bounds) return null;
		const { x, y, w, h, rotation } = bounds;
		const cx = x + w / 2;
		const cy = y + h / 2;
		const rad = -rotation * Math.PI / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		// Transform mouse to local space
		const dx = mx - cx;
		const dy = my - cy;
		const lx = dx * cos - dy * sin;
		const ly = dx * sin + dy * cos;

		const hs = HANDLE_SIZE / $zoom;

		// Check rotation handle (above top center)
		const rotDist = Math.hypot(lx, ly - (-h / 2 - ROTATION_HANDLE_OFFSET / $zoom));
		if (rotDist < hs * 1.5) return 'rotate';

		// Corner handles
		const corners = [
			{ name: 'nw', lx: -w / 2, ly: -h / 2 },
			{ name: 'ne', lx: w / 2, ly: -h / 2 },
			{ name: 'sw', lx: -w / 2, ly: h / 2 },
			{ name: 'se', lx: w / 2, ly: h / 2 },
		];
		for (const c of corners) {
			if (Math.abs(lx - c.lx) < hs && Math.abs(ly - c.ly) < hs) return c.name;
		}

		// Edge handles
		const edges = [
			{ name: 'n', lx: 0, ly: -h / 2 },
			{ name: 's', lx: 0, ly: h / 2 },
			{ name: 'w', lx: -w / 2, ly: 0 },
			{ name: 'e', lx: w / 2, ly: 0 },
		];
		for (const e of edges) {
			if (Math.abs(lx - e.lx) < hs && Math.abs(ly - e.ly) < hs) return e.name;
		}

		return null;
	}

	function handleMouseDown(e) {
		if (e.button === 1 || (e.button === 0 && e.altKey)) {
			isPanning = true;
			lastMouse = { x: e.clientX, y: e.clientY };
			e.preventDefault();
			return;
		}

		if (e.button === 0 && !e.altKey) {
			const m = getCanvasCoords(e);

			// Check selected image layer handles first
			const selectedLayer = $layers.find(l => l.id === $activeLayerId && l.type === 'image' && l.visible);
			if (selectedLayer) {
				const bounds = getLayerBounds(selectedLayer);
				const handle = hitTestHandle(m.x, m.y, bounds);
				if (handle === 'rotate') {
					layerInteraction = { mode: 'rotate', layerId: selectedLayer.id };
					const b = getLayerBounds(selectedLayer);
					interactionStart = {
						mx: m.x, my: m.y,
						origTransform: { ...selectedLayer.transform },
						centerX: b.x + b.w / 2,
						centerY: b.y + b.h / 2
					};
					e.preventDefault();
					return;
				}
				if (handle) {
					layerInteraction = { mode: 'resize', layerId: selectedLayer.id, handle };
					interactionStart = {
						mx: m.x, my: m.y,
						origTransform: { ...selectedLayer.transform }
					};
					e.preventDefault();
					return;
				}
			}

			// Check stickers (reverse order for top-most)
			const stickerArr = /** @type {any[]} */ ($stickers);
			for (let i = stickerArr.length - 1; i >= 0; i--) {
				const s = stickerArr[i];
				if (!s._visible || s._locked) continue;
				if (m.x >= s.x && m.x <= s.x + s.size && m.y >= s.y && m.y <= s.y + s.size) {
					dragging = { type: 'sticker', layerId: s._layerId, index: i };
					dragStart = { x: m.x - s.x, y: m.y - s.y };
					activeLayerId.set(s._layerId);
					e.preventDefault();
					return;
				}
			}

			// Check text layers
			const textArr = /** @type {any[]} */ ($textLayers);
			for (let i = textArr.length - 1; i >= 0; i--) {
				const t = textArr[i];
				if (!t._visible || t._locked) continue;
				const tw = t.text.length * t.size * 0.6;
				const th = t.size * 1.2;
				if (m.x >= t.x && m.x <= t.x + tw && m.y >= t.y - th && m.y <= t.y) {
					dragging = { type: 'text', layerId: t._layerId, index: i };
					dragStart = { x: m.x - t.x, y: m.y - t.y };
					activeLayerId.set(t._layerId);
					e.preventDefault();
					return;
				}
			}

			// Check image layers top-to-bottom for click selection + move
			const layersArr = [...$layers].reverse();
			for (const layer of layersArr) {
				if (layer.type !== 'image' || !layer.visible || layer.locked) continue;
				const bounds = getLayerBounds(layer);
				if (!bounds) continue;
				if (pointInRotatedRect(m.x, m.y, bounds.x, bounds.y, bounds.w, bounds.h, bounds.rotation)) {
					activeLayerId.set(layer.id);
					layerInteraction = { mode: 'move', layerId: layer.id };
					interactionStart = {
						mx: m.x, my: m.y,
						origTransform: { ...layer.transform }
					};
					e.preventDefault();
					return;
				}
			}
		}
	}

	function handleMouseMove(e) {
		if (isPanning) {
			const dx = e.clientX - lastMouse.x;
			const dy = e.clientY - lastMouse.y;
			panOffset.update(p => ({ x: p.x + dx, y: p.y + dy }));
			lastMouse = { x: e.clientX, y: e.clientY };
			return;
		}

		if (dragging) {
			const m = getCanvasCoords(e);
			updateLayerData(dragging.layerId, { x: m.x - dragStart.x, y: m.y - dragStart.y });
			return;
		}

		if (layerInteraction) {
			const m = getCanvasCoords(e);
			const orig = interactionStart.origTransform;

			if (layerInteraction.mode === 'move') {
				const dx = m.x - interactionStart.mx;
				const dy = m.y - interactionStart.my;
				updateLayerTransform(layerInteraction.layerId, {
					x: orig.x + dx,
					y: orig.y + dy
				});
			} else if (layerInteraction.mode === 'rotate') {
				const cx = interactionStart.centerX;
				const cy = interactionStart.centerY;
				const startAngle = Math.atan2(interactionStart.my - cy, interactionStart.mx - cx);
				const currentAngle = Math.atan2(m.y - cy, m.x - cx);
				let delta = (currentAngle - startAngle) * 180 / Math.PI;
				// Snap to 15 degree increments when holding shift
				if (e.shiftKey) {
					delta = Math.round(delta / 15) * 15;
				}
				updateLayerTransform(layerInteraction.layerId, {
					rotation: orig.rotation + delta
				});
			} else if (layerInteraction.mode === 'resize') {
				const handle = layerInteraction.handle;
				const dx = m.x - interactionStart.mx;
				const dy = m.y - interactionStart.my;
				const origW = orig.width * orig.scaleX;
				const origH = orig.height * orig.scaleY;

				let newX = orig.x, newY = orig.y, newW = origW, newH = origH;

				if (handle.includes('e')) { newW = origW + dx; }
				if (handle.includes('w')) { newW = origW - dx; newX = orig.x + dx; }
				if (handle.includes('s')) { newH = origH + dy; }
				if (handle.includes('n')) { newH = origH - dy; newY = orig.y + dy; }

				// Proportional resize with Shift
				if (e.shiftKey && orig.width > 0 && orig.height > 0) {
					const aspect = origW / origH;
					if (handle === 'n' || handle === 's') {
						newW = Math.abs(newH) * aspect;
					} else if (handle === 'e' || handle === 'w') {
						newH = Math.abs(newW) / aspect;
					} else {
						// Corner: use the larger delta
						const scaleW = newW / origW;
						const scaleH = newH / origH;
						const scale = Math.max(Math.abs(scaleW), Math.abs(scaleH));
						newW = origW * scale * Math.sign(scaleW || 1);
						newH = origH * scale * Math.sign(scaleH || 1);
					}
				}

				// Minimum size
				newW = Math.max(10, newW);
				newH = Math.max(10, newH);

				updateLayerTransform(layerInteraction.layerId, {
					x: newX,
					y: newY,
					scaleX: newW / orig.width,
					scaleY: newH / orig.height
				});
			}
		}
	}

	function handleMouseUp() {
		isPanning = false;
		dragging = null;
		layerInteraction = null;
	}

	// --- Touch support ---
	let lastTouchDist = 0;
	let lastTouchCenter = { x: 0, y: 0 };
	let touchMode = null; // 'pan' | 'pinch' | null

	function getTouchDist(touches) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.hypot(dx, dy);
	}

	function getTouchCenter(touches) {
		return {
			x: (touches[0].clientX + touches[1].clientX) / 2,
			y: (touches[0].clientY + touches[1].clientY) / 2
		};
	}

	function handleTouchStart(e) {
		if (e.touches.length === 2) {
			e.preventDefault();
			touchMode = 'pinch';
			lastTouchDist = getTouchDist(e.touches);
			lastTouchCenter = getTouchCenter(e.touches);
		} else if (e.touches.length === 1) {
			touchMode = 'pan';
			lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			isPanning = true;
		}
	}

	function handleTouchMove(e) {
		if (touchMode === 'pinch' && e.touches.length === 2) {
			e.preventDefault();
			const dist = getTouchDist(e.touches);
			const scale = dist / lastTouchDist;
			zoom.update(z => Math.max(0.1, Math.min(5, z * scale)));
			lastTouchDist = dist;

			const center = getTouchCenter(e.touches);
			const dx = center.x - lastTouchCenter.x;
			const dy = center.y - lastTouchCenter.y;
			panOffset.update(p => ({ x: p.x + dx, y: p.y + dy }));
			lastTouchCenter = center;
		} else if (touchMode === 'pan' && e.touches.length === 1) {
			const dx = e.touches[0].clientX - lastMouse.x;
			const dy = e.touches[0].clientY - lastMouse.y;
			panOffset.update(p => ({ x: p.x + dx, y: p.y + dy }));
			lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
	}

	function handleTouchEnd(e) {
		if (e.touches.length < 2) {
			touchMode = null;
		}
		if (e.touches.length === 0) {
			isPanning = false;
			touchMode = null;
		}
	}

	// Compute selection handles for the active image layer
	const selectedImageLayer = $derived($layers.find(l => l.id === $activeLayerId && l.type === 'image' && l.visible));
	const selectionBounds = $derived.by(() => {
		if (!selectedImageLayer?.transform) return null;
		return getLayerBounds(selectedImageLayer);
	});

	function getHandlePositions(bounds) {
		if (!bounds) return [];
		const { x, y, w, h } = bounds;
		return [
			{ name: 'nw', x: x, y: y, cursor: 'nw-resize' },
			{ name: 'n', x: x + w / 2, y: y, cursor: 'n-resize' },
			{ name: 'ne', x: x + w, y: y, cursor: 'ne-resize' },
			{ name: 'e', x: x + w, y: y + h / 2, cursor: 'e-resize' },
			{ name: 'se', x: x + w, y: y + h, cursor: 'se-resize' },
			{ name: 's', x: x + w / 2, y: y + h, cursor: 's-resize' },
			{ name: 'sw', x: x, y: y + h, cursor: 'sw-resize' },
			{ name: 'w', x: x, y: y + h / 2, cursor: 'w-resize' },
		];
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="flex-1 overflow-hidden relative bg-[#111122] flex items-center justify-center"
	bind:this={containerEl}
	onwheel={handleWheel}
	onmousedown={handleMouseDown}
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	onmouseleave={handleMouseUp}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	role="application"
	aria-label="Canvas area"
	style="touch-action: none;"
>
	{#if $originalImage}
		<div
			class="relative"
			style="transform: translate({$panOffset.x}px, {$panOffset.y}px) scale({$zoom}); transform-origin: center center;"
		>
			<!-- The processed canvas is rendered off-screen, displayed here -->
			<canvas bind:this={canvas} class="shadow-2xl block"></canvas>

			<!-- Selection handles for active image layer -->
			{#if selectionBounds}
				{@const b = selectionBounds}
				<div
					class="absolute pointer-events-none"
					style="
						left: {b.x}px; top: {b.y}px;
						width: {b.w}px; height: {b.h}px;
						transform-origin: center center;
						transform: rotate({b.rotation}deg);
					"
				>
					<!-- Bounding box border -->
					<div class="absolute inset-0 border-2 border-sky-400" style="border-style: solid;"></div>

					<!-- Resize handles -->
					{#each getHandlePositions({ x: 0, y: 0, w: b.w, h: b.h }) as handle}
						<div
							class="absolute bg-white border border-sky-500 pointer-events-auto"
							style="
								left: {handle.x - 4}px; top: {handle.y - 4}px;
								width: 8px; height: 8px;
								cursor: {handle.cursor};
							"
						></div>
					{/each}

					<!-- Rotation handle -->
					<div class="absolute pointer-events-auto" style="
						left: {b.w / 2 - 5}px;
						top: -{ROTATION_HANDLE_OFFSET}px;
						width: 10px; height: 10px;
						cursor: grab;
					">
						<!-- Line from top center to rotation handle -->
						<div class="absolute bg-sky-400" style="
							left: 4px; top: 10px;
							width: 1px; height: {ROTATION_HANDLE_OFFSET - 10}px;
						"></div>
						<!-- Rotation circle -->
						<div class="w-[10px] h-[10px] rounded-full bg-white border border-sky-500"></div>
					</div>
				</div>
			{/if}

			<!-- Text layers overlay (for interactive dragging) -->
			{#each $textLayers as layer, i}
				{#if layer._visible}
					<div
						class="absolute pointer-events-none select-none"
						style="
							left: {layer.x}px;
							top: {layer.y - layer.size * 1.2}px;
							font-size: {layer.size}px;
							font-family: {layer.font};
							color: {layer.color};
							opacity: {(layer.opacity ?? 1) * (layer._opacity ?? 1)};
							font-weight: {layer.bold ? 'bold' : 'normal'};
							font-style: {layer.italic ? 'italic' : 'normal'};
							text-align: {layer.align};
							white-space: nowrap;
							{layer.shadow ? `text-shadow: 2px 2px 4px rgba(0,0,0,0.7);` : ''}
							{layer.outline ? `-webkit-text-stroke: 1px ${layer.outlineColor || '#000'};` : ''}
						"
					>
						{layer.text}
					</div>
				{/if}
			{/each}

			<!-- Stickers overlay (for interactive dragging) -->
			{#each $stickers as sticker, i}
				{#if sticker._visible}
					<div
						class="absolute pointer-events-none select-none"
						style="
							left: {sticker.x}px;
							top: {sticker.y}px;
							font-size: {sticker.size}px;
							line-height: 1;
							opacity: {sticker._opacity ?? 1};
						"
					>
						{sticker.emoji}
					</div>
				{/if}
			{/each}

			<!-- Crop overlay -->
			{#if $cropState.active}
				<div class="absolute inset-0 pointer-events-none">
					<div class="absolute bg-black/50" style="top:0;left:0;right:0;height:{$cropState.y}px;"></div>
					<div class="absolute bg-black/50" style="top:{$cropState.y + $cropState.height}px;left:0;right:0;bottom:0;"></div>
					<div class="absolute bg-black/50" style="top:{$cropState.y}px;left:0;width:{$cropState.x}px;height:{$cropState.height}px;"></div>
					<div class="absolute bg-black/50" style="top:{$cropState.y}px;left:{$cropState.x + $cropState.width}px;right:0;height:{$cropState.height}px;"></div>
					<div
						class="absolute border-2 border-white"
						style="left:{$cropState.x}px;top:{$cropState.y}px;width:{$cropState.width}px;height:{$cropState.height}px;"
					>
						<div class="absolute -top-1 -left-1 w-3 h-3 bg-white"></div>
						<div class="absolute -top-1 -right-1 w-3 h-3 bg-white"></div>
						<div class="absolute -bottom-1 -left-1 w-3 h-3 bg-white"></div>
						<div class="absolute -bottom-1 -right-1 w-3 h-3 bg-white"></div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-center text-editor-muted">
			<svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
				<path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
			</svg>
			<p class="text-lg">Upload an image to start editing</p>
			<p class="text-sm mt-1 opacity-60">or drag & drop</p>
		</div>
	{/if}
</div>
