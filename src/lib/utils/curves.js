// Monotone cubic spline interpolation for curves
// Returns a lookup table (256 entries) from control points

export function buildCurveLUT(points) {
	if (points.length < 2) {
		return Array.from({ length: 256 }, (_, i) => i);
	}

	const sorted = [...points].sort((a, b) => a.x - b.x);
	const n = sorted.length;
	const xs = sorted.map(p => p.x);
	const ys = sorted.map(p => p.y);

	// For 2 points, use linear interpolation
	if (n === 2) {
		const lut = new Array(256);
		for (let i = 0; i < 256; i++) {
			if (i <= xs[0]) {
				lut[i] = ys[0];
			} else if (i >= xs[n - 1]) {
				lut[i] = ys[n - 1];
			} else {
				const t = (i - xs[0]) / (xs[1] - xs[0]);
				lut[i] = ys[0] + t * (ys[1] - ys[0]);
			}
			lut[i] = Math.max(0, Math.min(255, Math.round(lut[i])));
		}
		return lut;
	}

	// Compute slopes
	const dxs = [], dys = [], ms = [];
	for (let i = 0; i < n - 1; i++) {
		dxs.push(xs[i + 1] - xs[i]);
		dys.push(ys[i + 1] - ys[i]);
		ms.push(dys[i] / dxs[i]);
	}

	// Compute degree-1 coefficients
	const c1s = [ms[0]];
	for (let i = 0; i < dxs.length - 1; i++) {
		const m0 = ms[i], m1 = ms[i + 1];
		if (m0 * m1 <= 0) {
			c1s.push(0);
		} else {
			const dxR = dxs[i], dxL = dxs[i + 1], common = dxR + dxL;
			c1s.push(3 * common / ((common + dxL) / m0 + (common + dxR) / m1));
		}
	}
	c1s.push(ms[ms.length - 1]);

	// Compute degree-2 and degree-3 coefficients
	const c2s = [], c3s = [];
	for (let i = 0; i < c1s.length - 1; i++) {
		const c1 = c1s[i], m_ = ms[i], invDx = 1 / dxs[i];
		const common_ = c1 + c1s[i + 1] - m_ - m_;
		c2s.push((m_ - c1 - common_) * invDx);
		c3s.push(common_ * invDx * invDx);
	}

	// Build LUT
	const lut = new Array(256);
	for (let i = 0; i < 256; i++) {
		if (i <= xs[0]) {
			lut[i] = ys[0];
		} else if (i >= xs[n - 1]) {
			lut[i] = ys[n - 1];
		} else {
			// Find segment
			let seg = n - 2;
			for (let j = 0; j < n - 1; j++) {
				if (i < xs[j + 1]) { seg = j; break; }
			}
			const diff = i - xs[seg];
			lut[i] = ys[seg] + c1s[seg] * diff + c2s[seg] * diff * diff + c3s[seg] * diff * diff * diff;
		}
		lut[i] = Math.max(0, Math.min(255, Math.round(lut[i])));
	}
	return lut;
}
