<script>
	import { onMount } from 'svelte';
	import {
		layers, activeLayerId, BLEND_MODES, BLEND_MODE_LABELS,
		addLayer, removeLayer, duplicateLayer, moveLayer, mergeDown,
		toggleVisibility, toggleLock, setLayerOpacity, setLayerBlendMode, setLayerName,
		syncProxiesFromActiveLayer, imageInfo
	} from '$lib/stores/editor.js';

	let { onaddimage } = $props();

	let editingNameId = $state(null);
	let editNameValue = $state('');
	let fileInputEl;

	// Thumbnail cache: layerId -> dataURL
	let thumbnails = $state({});
	let thumbTimer = null;

	function handleAddLayer() {
		// Open file picker to add a photo as a new layer
		fileInputEl?.click();
	}

	function handleFileSelected(e) {
		const file = e.target.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		if (onaddimage) onaddimage(file);
		e.target.value = '';
	}

	function startRename(id, currentName) {
		editingNameId = id;
		editNameValue = currentName;
	}

	function commitRename(id) {
		if (editNameValue.trim()) {
			setLayerName(id, editNameValue.trim());
		}
		editingNameId = null;
	}

	function getTypeIcon(type) {
		if (type === 'text') return 'T';
		if (type === 'sticker') return '\u263A';
		return '\u25A3';
	}

	function selectLayer(id) {
		activeLayerId.set(id);
		syncProxiesFromActiveLayer();
	}

	$effect(() => {
		// Auto-select top layer if none selected
		if (!$activeLayerId && $layers.length > 0) {
			activeLayerId.set($layers[$layers.length - 1].id);
			syncProxiesFromActiveLayer();
		}
	});

	// Generate thumbnails (debounced)
	$effect(() => {
		$layers; // react to layer changes
		clearTimeout(thumbTimer);
		thumbTimer = setTimeout(() => generateThumbnails(), 200);
	});

	function generateThumbnails() {
		const newThumbs = {};
		for (const layer of $layers) {
			if (layer.type === 'image' && layer.data?.imageData) {
				try {
					const imgData = layer.data.imageData;
					const thumbSize = 40;
					const aspect = imgData.width / imgData.height;
					const tw = aspect >= 1 ? thumbSize : Math.round(thumbSize * aspect);
					const th = aspect >= 1 ? Math.round(thumbSize / aspect) : thumbSize;

					const c = document.createElement('canvas');
					c.width = tw;
					c.height = th;
					const ctx = c.getContext('2d');

					// Draw scaled down
					const src = document.createElement('canvas');
					src.width = imgData.width;
					src.height = imgData.height;
					src.getContext('2d').putImageData(imgData, 0, 0);
					ctx.drawImage(src, 0, 0, tw, th);

					newThumbs[layer.id] = c.toDataURL('image/jpeg', 0.6);
				} catch {
					// skip if thumbnail generation fails
				}
			}
		}
		thumbnails = newThumbs;
	}

	const selectedLayer = $derived($layers.find(l => l.id === $activeLayerId));
</script>

<input
	type="file"
	accept="image/*"
	class="hidden"
	bind:this={fileInputEl}
	onchange={handleFileSelected}
/>

<div class="panel">
	<div class="flex items-center justify-between mb-3">
		<h3 class="panel-title">Layers</h3>
		<button class="add-btn" onclick={handleAddLayer} title="Add photo layer">+</button>
	</div>

	<!-- Layer list (top to bottom = last to first) -->
	<div class="layer-list">
		{#each [...$layers].reverse() as layer (layer.id)}
			<div
				class="layer-row"
				class:selected={$activeLayerId === layer.id}
				onclick={() => selectLayer(layer.id)}
				onkeydown={(e) => e.key === 'Enter' && selectLayer(layer.id)}
				role="button"
				tabindex="0"
			>
				<!-- Visibility toggle -->
				<button
					class="vis-btn"
					class:hidden-layer={!layer.visible}
					onclick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
					title={layer.visible ? 'Hide layer' : 'Show layer'}
				>
					{#if layer.visible}
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
						</svg>
					{:else}
						<svg class="w-3.5 h-3.5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/>
						</svg>
					{/if}
				</button>

				<!-- Thumbnail or type icon -->
				{#if layer.type === 'image' && thumbnails[layer.id]}
					<img src={thumbnails[layer.id]} alt="" class="layer-thumb" />
				{:else}
					<span class="type-icon">{getTypeIcon(layer.type)}</span>
				{/if}

				<!-- Name -->
				{#if editingNameId === layer.id}
					<input
						class="name-input"
						bind:value={editNameValue}
						onblur={() => commitRename(layer.id)}
						onkeydown={(e) => { if (e.key === 'Enter') commitRename(layer.id); if (e.key === 'Escape') editingNameId = null; }}
						onclick={(e) => e.stopPropagation()}
					/>
				{:else}
					<span
						class="layer-name"
						ondblclick={(e) => { e.stopPropagation(); startRename(layer.id, layer.name); }}
					>
						{layer.name}
					</span>
				{/if}

				<!-- Lock indicator -->
				{#if layer.locked}
					<span class="lock-icon" title="Locked">\uD83D\uDD12</span>
				{/if}

				<!-- Opacity mini -->
				<span class="opacity-badge">{Math.round(layer.opacity * 100)}%</span>
			</div>
		{/each}
	</div>

	{#if $layers.length === 0}
		<p class="text-xs text-editor-muted text-center py-4">No layers yet</p>
	{/if}

	<!-- Selected layer controls -->
	{#if selectedLayer}
		<div class="controls-section">
			<!-- Opacity -->
			<div class="control-row">
				<label class="control-label">Opacity</label>
				<div class="flex items-center gap-2 flex-1">
					<input
						type="range"
						min="0" max="1" step="0.01"
						value={selectedLayer.opacity}
						oninput={(e) => setLayerOpacity(selectedLayer.id, +e.target.value)}
						class="flex-1"
					/>
					<span class="text-xs w-9 text-right">{Math.round(selectedLayer.opacity * 100)}%</span>
				</div>
			</div>

			<!-- Blend mode -->
			<div class="control-row">
				<label class="control-label">Blend</label>
				<select
					class="blend-select"
					value={selectedLayer.blendMode}
					onchange={(e) => setLayerBlendMode(selectedLayer.id, e.target.value)}
				>
					{#each BLEND_MODES as mode}
						<option value={mode}>{BLEND_MODE_LABELS[mode]}</option>
					{/each}
				</select>
			</div>

			<!-- Action buttons -->
			<div class="action-bar">
				<button
					class="action-btn"
					onclick={() => moveLayer(selectedLayer.id, 1)}
					title="Move up"
				>&#9650;</button>
				<button
					class="action-btn"
					onclick={() => moveLayer(selectedLayer.id, -1)}
					title="Move down"
				>&#9660;</button>
				<button
					class="action-btn"
					onclick={() => duplicateLayer(selectedLayer.id)}
					title="Duplicate"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
					</svg>
				</button>
				<button
					class="action-btn"
					onclick={() => toggleLock(selectedLayer.id)}
					title={selectedLayer.locked ? 'Unlock' : 'Lock'}
				>
					{#if selectedLayer.locked}
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
						</svg>
					{:else}
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
						</svg>
					{/if}
				</button>
				<button
					class="action-btn"
					onclick={() => mergeDown(selectedLayer.id)}
					title="Merge down"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
					</svg>
				</button>
				<button
					class="action-btn delete"
					onclick={() => removeLayer(selectedLayer.id)}
					title="Delete layer"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.panel { padding: 0.75rem; }
	.panel-title { font-size: 0.875rem; font-weight: 600; }

	.add-btn {
		width: 26px; height: 26px;
		display: flex; align-items: center; justify-content: center;
		font-size: 1.1rem; font-weight: bold;
		background: var(--color-editor-accent);
		color: white; border: none; border-radius: 0.25rem;
		cursor: pointer;
	}
	.add-btn:hover { opacity: 0.85; }

	.layer-list {
		display: flex; flex-direction: column; gap: 1px;
		max-height: 300px; overflow-y: auto;
		border: 1px solid var(--color-editor-border);
		border-radius: 0.375rem;
		background: var(--color-editor-bg);
	}

	.layer-row {
		display: flex; align-items: center; gap: 6px;
		padding: 6px 8px;
		cursor: pointer;
		transition: background 0.1s;
		min-height: 40px;
	}
	.layer-row:hover { background: var(--color-editor-panel); }
	.layer-row.selected { background: var(--color-editor-hover); outline: 1px solid var(--color-editor-accent); outline-offset: -1px; }

	.vis-btn {
		background: none; border: none; color: var(--color-editor-text);
		cursor: pointer; padding: 2px; flex-shrink: 0;
		display: flex; align-items: center;
	}
	.vis-btn.hidden-layer { color: var(--color-editor-muted); }

	.type-icon {
		font-size: 0.7rem; width: 16px; text-align: center; flex-shrink: 0;
		color: var(--color-editor-muted);
	}

	.layer-thumb {
		width: 32px; height: 32px;
		object-fit: cover;
		border-radius: 3px;
		border: 1px solid var(--color-editor-border);
		flex-shrink: 0;
	}

	.layer-name {
		font-size: 0.75rem; flex: 1; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap;
		color: var(--color-editor-text);
	}

	.name-input {
		font-size: 0.75rem; flex: 1;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-accent);
		border-radius: 2px;
		color: var(--color-editor-text);
		padding: 1px 4px;
		outline: none;
	}

	.lock-icon { font-size: 0.6rem; flex-shrink: 0; }

	.opacity-badge {
		font-size: 0.6rem; color: var(--color-editor-muted);
		flex-shrink: 0; width: 28px; text-align: right;
	}

	.controls-section {
		margin-top: 0.75rem; padding-top: 0.75rem;
		border-top: 1px solid var(--color-editor-border);
		display: flex; flex-direction: column; gap: 8px;
	}

	.control-row {
		display: flex; align-items: center; gap: 8px;
	}
	.control-label {
		font-size: 0.7rem; color: var(--color-editor-muted);
		width: 42px; flex-shrink: 0;
	}

	.blend-select {
		flex: 1;
		padding: 3px 4px; font-size: 0.7rem;
		background: var(--color-editor-bg);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
	}

	.action-bar {
		display: flex; gap: 4px; justify-content: center;
	}
	.action-btn {
		width: 30px; height: 28px;
		display: flex; align-items: center; justify-content: center;
		background: var(--color-editor-panel);
		border: 1px solid var(--color-editor-border);
		border-radius: 0.25rem;
		color: var(--color-editor-text);
		cursor: pointer; font-size: 0.7rem;
	}
	.action-btn:hover { background: var(--color-editor-hover); }
	.action-btn.delete:hover { background: #c0392b; color: white; }
</style>
