// RGB <-> HSL conversion
export function rgbToHsl(r, g, b) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h, s, l = (max + min) / 2;

	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
			case g: h = ((b - r) / d + 2) / 6; break;
			case b: h = ((r - g) / d + 4) / 6; break;
		}
	}
	return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h, s, l) {
	h /= 360; s /= 100; l /= 100;
	let r, g, b;
	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1/6) return p + (q - p) * 6 * t;
			if (t < 1/2) return q;
			if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}
	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

export function rgbToHex(r, g, b) {
	return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

// Determine which HSL channel a hue belongs to
export function getHueChannel(hue) {
	if (hue >= 345 || hue < 15) return 'reds';
	if (hue >= 15 && hue < 45) return 'oranges';
	if (hue >= 45 && hue < 75) return 'yellows';
	if (hue >= 75 && hue < 165) return 'greens';
	if (hue >= 165 && hue < 195) return 'cyans';
	if (hue >= 195 && hue < 270) return 'blues';
	if (hue >= 270 && hue < 345) return 'magentas';
	return 'reds';
}

// Apply brightness: shift all channels
export function applyBrightness(r, g, b, amount) {
	const shift = amount * 2.55;
	return [r + shift, g + shift, b + shift];
}

// Apply contrast
export function applyContrast(r, g, b, amount) {
	const factor = (259 * (amount + 255)) / (255 * (259 - amount));
	return [
		factor * (r - 128) + 128,
		factor * (g - 128) + 128,
		factor * (b - 128) + 128
	];
}

// Apply exposure (multiplicative brightness)
export function applyExposure(r, g, b, amount) {
	const factor = Math.pow(2, amount / 100);
	return [r * factor, g * factor, b * factor];
}

// Apply saturation
export function applySaturation(r, g, b, amount) {
	const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	const factor = 1 + amount / 100;
	return [
		gray + factor * (r - gray),
		gray + factor * (g - gray),
		gray + factor * (b - gray)
	];
}

// Vibrance: boost muted colors more
export function applyVibrance(r, g, b, amount) {
	const max = Math.max(r, g, b);
	const avg = (r + g + b) / 3;
	const amt = ((Math.abs(max - avg) * 2 / 255) * amount) / 100;
	const factor = 1 + amt * (max === r ? -1 : 1);
	const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return [
		gray + factor * (r - gray),
		gray + factor * (g - gray),
		gray + factor * (b - gray)
	];
}

// Luminosity for color balance
function luminosity(r, g, b) {
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Apply color balance
export function applyColorBalance(r, g, b, balance) {
	const lum = luminosity(r, g, b);
	const shadowWeight = 1 - Math.min(1, lum * 4);
	const highlightWeight = Math.max(0, (lum - 0.75) * 4);
	const midtoneWeight = 1 - shadowWeight - highlightWeight;

	const { shadows, midtones, highlights } = balance;

	r += shadows.cyan_red * shadowWeight + midtones.cyan_red * midtoneWeight + highlights.cyan_red * highlightWeight;
	g += shadows.magenta_green * shadowWeight + midtones.magenta_green * midtoneWeight + highlights.magenta_green * highlightWeight;
	b += shadows.yellow_blue * shadowWeight + midtones.yellow_blue * midtoneWeight + highlights.yellow_blue * highlightWeight;

	return [r, g, b];
}

// Color distance for color replacement
export function colorDistance(r1, g1, b1, r2, g2, b2) {
	return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

// Preset filters as adjustment combinations
export const filterPresets = {
	none: { name: 'None', fn: null },
	grayscale: {
		name: 'Grayscale',
		fn: (r, g, b) => {
			const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			return [gray, gray, gray];
		}
	},
	sepia: {
		name: 'Sepia',
		fn: (r, g, b) => [
			Math.min(255, r * 0.393 + g * 0.769 + b * 0.189),
			Math.min(255, r * 0.349 + g * 0.686 + b * 0.168),
			Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
		]
	},
	vintage: {
		name: 'Vintage',
		fn: (r, g, b) => [
			Math.min(255, r * 0.9 + 40),
			Math.min(255, g * 0.8 + 20),
			Math.min(255, b * 0.6 + 10)
		]
	},
	cool: {
		name: 'Cool',
		fn: (r, g, b) => [r * 0.9, g * 0.95, Math.min(255, b * 1.15 + 10)]
	},
	warm: {
		name: 'Warm',
		fn: (r, g, b) => [Math.min(255, r * 1.1 + 10), g * 1.0, b * 0.85]
	},
	dramatic: {
		name: 'Dramatic',
		fn: (r, g, b) => {
			const factor = 1.5;
			return [
				factor * (r - 128) + 128,
				factor * (g - 128) + 128,
				factor * (b - 128) + 128
			];
		}
	},
	fade: {
		name: 'Fade',
		fn: (r, g, b) => [
			r * 0.8 + 30,
			g * 0.8 + 30,
			b * 0.8 + 30
		]
	},
	noir: {
		name: 'Noir',
		fn: (r, g, b) => {
			const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			const contrast = 1.4;
			const v = contrast * (gray - 128) + 128;
			return [v, v, v];
		}
	},
	cyberpunk: {
		name: 'Cyberpunk',
		fn: (r, g, b) => [
			Math.min(255, r * 1.2 + 20),
			g * 0.7,
			Math.min(255, b * 1.3 + 30)
		]
	},
	sunset: {
		name: 'Sunset',
		fn: (r, g, b) => [
			Math.min(255, r * 1.15 + 15),
			Math.min(255, g * 0.9 + 10),
			b * 0.75
		]
	}
};

// 3x3 kernel convolution for sharpen
export function convolve3x3(imageData, kernel) {
	const { width, height, data } = imageData;
	const output = new Uint8ClampedArray(data.length);

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			for (let c = 0; c < 3; c++) {
				let sum = 0;
				for (let ky = -1; ky <= 1; ky++) {
					for (let kx = -1; kx <= 1; kx++) {
						const idx = ((y + ky) * width + (x + kx)) * 4 + c;
						sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
					}
				}
				output[(y * width + x) * 4 + c] = sum;
			}
			output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
		}
	}
	return output;
}

export const sharpenKernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
