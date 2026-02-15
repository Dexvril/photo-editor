import {
	applyBrightness, applyContrast, applySaturation, applyExposure,
	applyVibrance, applyColorBalance, rgbToHsl, hslToRgb, getHueChannel,
	filterPresets, colorDistance, hexToRgb, convolve3x3, sharpenKernel
} from './filters.js';
import { buildCurveLUT } from './curves.js';

// Apply all adjustments to image data and return new ImageData
export function applyAllAdjustments(sourceData, adjustments, filter, filterIntensity, hsl, colorBal, curves, colorRep) {
	const { width, height } = sourceData;
	const src = sourceData.data;
	const out = new ImageData(width, height);
	const dst = out.data;

	// Build curves LUTs
	const lutRGB = buildCurveLUT(curves.rgb);
	const lutR = buildCurveLUT(curves.r);
	const lutG = buildCurveLUT(curves.g);
	const lutB = buildCurveLUT(curves.b);

	const hasHSL = Object.values(hsl).some(ch => ch.h !== 0 || ch.s !== 0 || ch.l !== 0);
	const hasCB = Object.values(colorBal).some(t =>
		t.cyan_red !== 0 || t.magenta_green !== 0 || t.yellow_blue !== 0
	);
	const hasCurves = curves.rgb.length > 2 ||
		curves.r.length > 2 || curves.g.length > 2 || curves.b.length > 2 ||
		(curves.rgb.length === 2 && (curves.rgb[0].y !== 0 || curves.rgb[1].y !== 255));
	const filterFn = filter !== 'none' && filterPresets[filter] ? filterPresets[filter].fn : null;
	const fIntensity = filterIntensity / 100;

	const replaceSource = hexToRgb(colorRep.sourceColor);
	const replaceTarget = hexToRgb(colorRep.targetColor);
	const hasReplace = colorRep.tolerance > 0;

	for (let i = 0; i < src.length; i += 4) {
		let r = src[i], g = src[i + 1], b = src[i + 2];

		if (adjustments.exposure !== 0) {
			[r, g, b] = applyExposure(r, g, b, adjustments.exposure);
		}
		if (adjustments.brightness !== 0) {
			[r, g, b] = applyBrightness(r, g, b, adjustments.brightness);
		}
		if (adjustments.contrast !== 0) {
			[r, g, b] = applyContrast(r, g, b, adjustments.contrast);
		}
		if (adjustments.saturation !== 0) {
			[r, g, b] = applySaturation(r, g, b, adjustments.saturation);
		}
		if (adjustments.vibrance !== 0) {
			[r, g, b] = applyVibrance(r, g, b, adjustments.vibrance);
		}

		if (hasHSL) {
			let [h, s, l] = rgbToHsl(
				Math.max(0, Math.min(255, r)),
				Math.max(0, Math.min(255, g)),
				Math.max(0, Math.min(255, b))
			);
			const channel = getHueChannel(h);
			const adj = hsl[channel];
			if (adj) {
				h = (h + adj.h + 360) % 360;
				s = Math.max(0, Math.min(100, s + adj.s));
				l = Math.max(0, Math.min(100, l + adj.l));
			}
			[r, g, b] = hslToRgb(h, s, l);
		}

		if (hasCB) {
			[r, g, b] = applyColorBalance(r, g, b, colorBal);
		}

		if (hasCurves) {
			r = lutR[lutRGB[Math.max(0, Math.min(255, Math.round(r)))]];
			g = lutG[lutRGB[Math.max(0, Math.min(255, Math.round(g)))]];
			b = lutB[lutRGB[Math.max(0, Math.min(255, Math.round(b)))]];
		}

		if (filterFn) {
			const [fr, fg, fb] = filterFn(
				Math.max(0, Math.min(255, r)),
				Math.max(0, Math.min(255, g)),
				Math.max(0, Math.min(255, b))
			);
			r = r + (fr - r) * fIntensity;
			g = g + (fg - g) * fIntensity;
			b = b + (fb - b) * fIntensity;
		}

		if (hasReplace) {
			const dist = colorDistance(r, g, b, replaceSource[0], replaceSource[1], replaceSource[2]);
			if (dist < colorRep.tolerance * 4.41) {
				const blend = 1 - dist / (colorRep.tolerance * 4.41);
				r = r + (replaceTarget[0] - r) * blend;
				g = g + (replaceTarget[1] - g) * blend;
				b = b + (replaceTarget[2] - b) * blend;
			}
		}

		dst[i] = Math.max(0, Math.min(255, Math.round(r)));
		dst[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
		dst[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
		dst[i + 3] = src[i + 3];
	}

	return out;
}

// Apply sharpen via convolution
export function applySharpen(imageData, amount) {
	if (amount <= 0) return imageData;
	const factor = amount / 100;
	const sharpened = convolve3x3(imageData, sharpenKernel);
	const out = new ImageData(imageData.width, imageData.height);
	const src = imageData.data;
	for (let i = 0; i < src.length; i++) {
		out.data[i] = Math.round(src[i] + (sharpened[i] - src[i]) * factor);
	}
	return out;
}

// Simple box blur
export function applyBlur(imageData, radius) {
	if (radius <= 0) return imageData;
	const { width, height, data } = imageData;
	const out = new ImageData(width, height);
	const dst = out.data;
	const r = Math.ceil(radius);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let rr = 0, gg = 0, bb = 0, aa = 0, count = 0;
			for (let dy = -r; dy <= r; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					const nx = x + dx, ny = y + dy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const idx = (ny * width + nx) * 4;
						rr += data[idx]; gg += data[idx+1]; bb += data[idx+2]; aa += data[idx+3];
						count++;
					}
				}
			}
			const idx = (y * width + x) * 4;
			dst[idx] = rr / count;
			dst[idx+1] = gg / count;
			dst[idx+2] = bb / count;
			dst[idx+3] = aa / count;
		}
	}
	return out;
}

// Render image with all effects onto a canvas (single-pass, no layers)
export function renderToCanvas(canvas, sourceImageData, adjustments, filter, filterIntensity, hsl, colorBal, curves, colorRep) {
	if (!canvas || !sourceImageData) return;
	const ctx = canvas.getContext('2d');
	canvas.width = sourceImageData.width;
	canvas.height = sourceImageData.height;

	let processed = applyAllAdjustments(sourceImageData, adjustments, filter, filterIntensity, hsl, colorBal, curves, colorRep);

	if (adjustments.sharpen > 0) {
		processed = applySharpen(processed, adjustments.sharpen);
	}
	if (adjustments.blur > 0) {
		processed = applyBlur(processed, adjustments.blur * 3);
	}

	ctx.putImageData(processed, 0, 0);
	return processed;
}

// Apply a layer's own adjustments to its imageData
function applyLayerAdjustments(imageData, adj) {
	if (!adj) return imageData;

	const basicAdj = {
		brightness: adj.brightness || 0,
		contrast: adj.contrast || 0,
		saturation: adj.saturation || 0,
		exposure: adj.exposure || 0,
		blur: adj.blur || 0,
		sharpen: adj.sharpen || 0,
		vibrance: adj.vibrance || 0
	};

	const filter = adj.filter || 'none';
	const filterInt = adj.filterIntensity ?? 100;
	const hsl = adj.hsl || {
		reds: { h: 0, s: 0, l: 0 }, oranges: { h: 0, s: 0, l: 0 },
		yellows: { h: 0, s: 0, l: 0 }, greens: { h: 0, s: 0, l: 0 },
		cyans: { h: 0, s: 0, l: 0 }, blues: { h: 0, s: 0, l: 0 },
		magentas: { h: 0, s: 0, l: 0 }
	};
	const colorBal = adj.colorBalance || {
		shadows: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
		midtones: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
		highlights: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 }
	};
	const curves = adj.curves || {
		rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
		r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
		g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
		b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
	};
	const colorRep = adj.colorReplace || { sourceColor: '#ff0000', targetColor: '#0000ff', tolerance: 30 };

	let processed = applyAllAdjustments(imageData, basicAdj, filter, filterInt, hsl, colorBal, curves, colorRep);

	if (basicAdj.sharpen > 0) {
		processed = applySharpen(processed, basicAdj.sharpen);
	}
	if (basicAdj.blur > 0) {
		processed = applyBlur(processed, basicAdj.blur * 3);
	}

	return processed;
}

// Render a text layer to an offscreen canvas
function renderTextLayer(layer, width, height) {
	const c = document.createElement('canvas');
	c.width = width;
	c.height = height;
	const ctx = c.getContext('2d');
	const d = layer.data;

	ctx.font = `${d.italic ? 'italic ' : ''}${d.bold ? 'bold ' : ''}${d.size}px ${d.font}`;
	ctx.fillStyle = d.color;
	ctx.globalAlpha = d.opacity ?? 1;
	ctx.textAlign = d.align || 'left';

	if (d.shadow) {
		ctx.shadowColor = 'rgba(0,0,0,0.7)';
		ctx.shadowBlur = 4;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
	}

	if (d.outline) {
		ctx.strokeStyle = d.outlineColor || '#000';
		ctx.lineWidth = 1;
		ctx.strokeText(d.text, d.x, d.y);
	}

	ctx.fillText(d.text, d.x, d.y);
	return c;
}

// Render a sticker layer to an offscreen canvas
function renderStickerLayer(layer, width, height) {
	const c = document.createElement('canvas');
	c.width = width;
	c.height = height;
	const ctx = c.getContext('2d');
	const d = layer.data;
	ctx.font = `${d.size}px serif`;
	ctx.fillText(d.emoji, d.x, d.y + d.size);
	return c;
}

// Composite all layers onto a destination canvas using per-layer adjustments + transforms
export function compositeLayers(canvas, layersArr, sourceImageData) {
	if (!canvas || !sourceImageData) return;
	const width = sourceImageData.width;
	const height = sourceImageData.height;
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, width, height);

	for (const layer of layersArr) {
		if (!layer.visible) continue;

		let layerCanvas;

		if (layer.type === 'image') {
			const imgData = layer.data.imageData || sourceImageData;
			const processed = applyLayerAdjustments(imgData, layer.adjustments);

			layerCanvas = document.createElement('canvas');
			layerCanvas.width = imgData.width;
			layerCanvas.height = imgData.height;
			layerCanvas.getContext('2d').putImageData(processed, 0, 0);
		} else if (layer.type === 'text') {
			layerCanvas = renderTextLayer(layer, width, height);
		} else if (layer.type === 'sticker') {
			layerCanvas = renderStickerLayer(layer, width, height);
		}

		if (layerCanvas) {
			ctx.save();
			ctx.globalAlpha = layer.opacity;
			ctx.globalCompositeOperation = layer.blendMode || 'source-over';

			// Apply transform for image layers
			if (layer.type === 'image' && layer.transform) {
				const t = layer.transform;
				const drawW = t.width * t.scaleX;
				const drawH = t.height * t.scaleY;
				const cx = t.x + drawW / 2;
				const cy = t.y + drawH / 2;

				if (t.rotation !== 0) {
					ctx.translate(cx, cy);
					ctx.rotate(t.rotation * Math.PI / 180);
					ctx.drawImage(layerCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
				} else {
					ctx.drawImage(layerCanvas, t.x, t.y, drawW, drawH);
				}
			} else {
				ctx.drawImage(layerCanvas, 0, 0);
			}

			ctx.restore();
		}
	}
}
