import { writable, derived, get } from 'svelte/store';

export const originalImage = writable(null);
export const canvasEl = writable(null);
export const previewCanvas = writable(null);
export const imageInfo = writable({ width: 0, height: 0, name: '' });
export const zoom = writable(1);
export const panOffset = writable({ x: 0, y: 0 });

export const activeTool = writable('adjust');

// Default adjustment values (used as template for each layer)
export const DEFAULT_ADJUSTMENTS = {
	brightness: 0, contrast: 0, saturation: 0,
	exposure: 0, blur: 0, sharpen: 0, vibrance: 0,
	filter: 'none',
	filterIntensity: 100,
	hsl: {
		reds: { h: 0, s: 0, l: 0 }, oranges: { h: 0, s: 0, l: 0 },
		yellows: { h: 0, s: 0, l: 0 }, greens: { h: 0, s: 0, l: 0 },
		cyans: { h: 0, s: 0, l: 0 }, blues: { h: 0, s: 0, l: 0 },
		magentas: { h: 0, s: 0, l: 0 }
	},
	colorBalance: {
		shadows: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
		midtones: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
		highlights: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 }
	},
	curves: {
		rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
		r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
		g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
		b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
	},
	colorReplace: { sourceColor: '#ff0000', targetColor: '#0000ff', tolerance: 30 }
};

function cloneAdjustments() {
	return JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS));
}

// Default transform
export const DEFAULT_TRANSFORM = { x: 0, y: 0, width: 0, height: 0, rotation: 0, scaleX: 1, scaleY: 1 };

export const cropState = writable({
	active: false,
	x: 0, y: 0,
	width: 0, height: 0,
	ratio: 'free'
});

// ============================================================
// Proxy stores — read/write the active layer's adjustments
// ============================================================
// These are writable stores that sync with the active layer.
// UI panels bind to these. When active layer changes, they update.

export const adjustments = writable({
	brightness: 0, contrast: 0, saturation: 0,
	exposure: 0, blur: 0, sharpen: 0, vibrance: 0
});
export const activeFilter = writable('none');
export const filterIntensity = writable(100);
export const hslAdjustments = writable(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.hsl)));
export const colorBalance = writable(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.colorBalance)));
export const curvesPoints = writable(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.curves)));
export const colorReplace = writable(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.colorReplace)));

export const history = writable([]);
export const historyIndex = writable(-1);

export const canUndo = derived(historyIndex, $i => $i > 0);
export const canRedo = derived([historyIndex, history], ([$i, $h]) => $i < $h.length - 1);

// ============================================================
// Layer system
// ============================================================

export const BLEND_MODES = [
	'source-over', 'multiply', 'screen', 'overlay',
	'darken', 'lighten', 'color-dodge', 'color-burn',
	'hard-light', 'soft-light', 'difference', 'exclusion',
];

export const BLEND_MODE_LABELS = {
	'source-over': 'Normal',
	'multiply': 'Multiply',
	'screen': 'Screen',
	'overlay': 'Overlay',
	'darken': 'Darken',
	'lighten': 'Lighten',
	'color-dodge': 'Color Dodge',
	'color-burn': 'Color Burn',
	'hard-light': 'Hard Light',
	'soft-light': 'Soft Light',
	'difference': 'Difference',
	'exclusion': 'Exclusion',
};

/**
 * Unified layers store.
 * Each layer: { id, name, type, visible, opacity, blendMode, locked, data, adjustments, transform }
 * type: 'image' | 'text' | 'sticker'
 * layers[0] = bottom (background), last = top
 */
export const layers = writable([]);

/** Currently selected layer id */
export const activeLayerId = writable(null);

/** Derived: text layers extracted from unified layers (for backward compat) */
export const textLayers = derived(layers, $layers =>
	$layers
		.filter(l => l.type === 'text')
		.map(l => ({ ...l.data, _layerId: l.id, _visible: l.visible, _opacity: l.opacity, _locked: l.locked }))
);

/** Derived: stickers extracted from unified layers */
export const stickers = derived(layers, $layers =>
	$layers
		.filter(l => l.type === 'sticker')
		.map(l => ({ ...l.data, _layerId: l.id, _visible: l.visible, _opacity: l.opacity, _locked: l.locked }))
);

let layerCounter = 0;

// Flag to prevent circular updates between proxy stores and layers
let _syncingFromLayer = false;
let _syncingToLayer = false;

export function createLayer(type, name, data, opts = {}) {
	layerCounter++;
	const adj = cloneAdjustments();
	const transform = { ...DEFAULT_TRANSFORM };

	// For image layers, set transform dimensions from imageData
	if (type === 'image' && data && data.imageData) {
		transform.width = data.imageData.width;
		transform.height = data.imageData.height;
	}

	return {
		id: crypto.randomUUID(),
		name: name || `Layer ${layerCounter}`,
		type,
		visible: true,
		opacity: opts.opacity ?? 1,
		blendMode: opts.blendMode ?? 'source-over',
		locked: opts.locked ?? false,
		data,
		adjustments: adj,
		transform
	};
}

export function addLayer(type, name, data, opts = {}) {
	const layer = createLayer(type, name, data, opts);
	layers.update(arr => [...arr, layer]);
	activeLayerId.set(layer.id);
	return layer;
}

export function removeLayer(id) {
	layers.update(arr => {
		const filtered = arr.filter(l => l.id !== id);
		return filtered;
	});
	const current = get(layers);
	if (get(activeLayerId) === id) {
		activeLayerId.set(current.length > 0 ? current[current.length - 1].id : null);
	}
}

export function duplicateLayer(id) {
	layers.update(arr => {
		const idx = arr.findIndex(l => l.id === id);
		if (idx === -1) return arr;
		const src = arr[idx];
		layerCounter++;
		const copy = {
			...src,
			id: crypto.randomUUID(),
			name: src.name + ' copy',
			data: { ...src.data },
			adjustments: JSON.parse(JSON.stringify(src.adjustments)),
			transform: { ...src.transform },
			locked: false
		};
		const result = [...arr];
		result.splice(idx + 1, 0, copy);
		activeLayerId.set(copy.id);
		return result;
	});
}

export function moveLayer(id, direction) {
	layers.update(arr => {
		const idx = arr.findIndex(l => l.id === id);
		if (idx === -1) return arr;
		const newIdx = idx + direction;
		if (newIdx < 0 || newIdx >= arr.length) return arr;
		const copy = [...arr];
		[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
		return copy;
	});
}

export function toggleVisibility(id) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, visible: !l.visible } : l
	));
}

export function toggleLock(id) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, locked: !l.locked } : l
	));
}

export function setLayerOpacity(id, opacity) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
	));
}

export function setLayerBlendMode(id, blendMode) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, blendMode } : l
	));
}

export function setLayerName(id, name) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, name } : l
	));
}

export function updateLayerData(id, dataUpdate) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, data: { ...l.data, ...dataUpdate } } : l
	));
}

export function updateLayerTransform(id, transformUpdate) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, transform: { ...l.transform, ...transformUpdate } } : l
	));
}

export function updateLayerAdjustments(id, adjUpdate) {
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, adjustments: { ...l.adjustments, ...adjUpdate } } : l
	));
}

export function mergeDown(id) {
	layers.update(arr => {
		const idx = arr.findIndex(l => l.id === id);
		if (idx <= 0) return arr;
		const top = arr[idx];
		const bottom = arr[idx - 1];
		if (top.type !== 'image' || bottom.type !== 'image') return arr;
		const { width, height } = bottom.data.imageData;
		const offscreen = document.createElement('canvas');
		offscreen.width = width;
		offscreen.height = height;
		const ctx = offscreen.getContext('2d');
		ctx.putImageData(bottom.data.imageData, 0, 0);
		const topCanvas = document.createElement('canvas');
		topCanvas.width = top.data.imageData.width;
		topCanvas.height = top.data.imageData.height;
		topCanvas.getContext('2d').putImageData(top.data.imageData, 0, 0);
		ctx.globalAlpha = top.opacity;
		ctx.globalCompositeOperation = top.blendMode;
		ctx.drawImage(topCanvas, 0, 0);
		const merged = ctx.getImageData(0, 0, width, height);
		const result = [...arr];
		result[idx - 1] = { ...bottom, data: { imageData: merged }, adjustments: cloneAdjustments() };
		result.splice(idx, 1);
		activeLayerId.set(bottom.id);
		return result;
	});
}

// ============================================================
// Sync proxy stores <-> active layer adjustments
// ============================================================

/** Load proxy stores from the active layer's adjustments */
export function syncProxiesFromActiveLayer() {
	_syncingFromLayer = true;
	const layersArr = get(layers);
	const id = get(activeLayerId);
	const layer = layersArr.find(l => l.id === id);
	if (layer && layer.adjustments) {
		const a = layer.adjustments;
		adjustments.set({
			brightness: a.brightness, contrast: a.contrast, saturation: a.saturation,
			exposure: a.exposure, blur: a.blur, sharpen: a.sharpen, vibrance: a.vibrance
		});
		activeFilter.set(a.filter);
		filterIntensity.set(a.filterIntensity);
		hslAdjustments.set(JSON.parse(JSON.stringify(a.hsl)));
		colorBalance.set(JSON.parse(JSON.stringify(a.colorBalance)));
		curvesPoints.set(JSON.parse(JSON.stringify(a.curves)));
		colorReplace.set(JSON.parse(JSON.stringify(a.colorReplace)));
	} else {
		// No active layer — reset to defaults
		adjustments.set({ brightness: 0, contrast: 0, saturation: 0, exposure: 0, blur: 0, sharpen: 0, vibrance: 0 });
		activeFilter.set('none');
		filterIntensity.set(100);
		hslAdjustments.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.hsl)));
		colorBalance.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.colorBalance)));
		curvesPoints.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.curves)));
		colorReplace.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.colorReplace)));
	}
	_syncingFromLayer = false;
}

/** Write current proxy store values into the active layer */
export function syncProxiesToActiveLayer() {
	if (_syncingFromLayer) return;
	_syncingToLayer = true;
	const id = get(activeLayerId);
	if (!id) { _syncingToLayer = false; return; }
	const adj = {
		brightness: get(adjustments).brightness,
		contrast: get(adjustments).contrast,
		saturation: get(adjustments).saturation,
		exposure: get(adjustments).exposure,
		blur: get(adjustments).blur,
		sharpen: get(adjustments).sharpen,
		vibrance: get(adjustments).vibrance,
		filter: get(activeFilter),
		filterIntensity: get(filterIntensity),
		hsl: JSON.parse(JSON.stringify(get(hslAdjustments))),
		colorBalance: JSON.parse(JSON.stringify(get(colorBalance))),
		curves: JSON.parse(JSON.stringify(get(curvesPoints))),
		colorReplace: JSON.parse(JSON.stringify(get(colorReplace)))
	};
	layers.update(arr => arr.map(l =>
		l.id === id ? { ...l, adjustments: adj } : l
	));
	_syncingToLayer = false;
}

/** Check if currently syncing to layer (to avoid circular $effect triggers) */
export function isSyncingToLayer() { return _syncingToLayer; }

export function resetAll() {
	adjustments.set({ brightness: 0, contrast: 0, saturation: 0, exposure: 0, blur: 0, sharpen: 0, vibrance: 0 });
	activeFilter.set('none');
	filterIntensity.set(100);
	hslAdjustments.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.hsl)));
	colorBalance.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.colorBalance)));
	curvesPoints.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.curves)));
	colorReplace.set(JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS.colorReplace)));
	layers.set([]);
	activeLayerId.set(null);
	layerCounter = 0;
}
