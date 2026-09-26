// Maps a data value to a pixel, and back with .invert().
export interface Scale {
	(value: number): number;
	invert(px: number): number;
}

// Straight-line scale from [d0, d1] (data) to [r0, r1] (pixels).
export function linearScale(d0: number, d1: number, r0: number, r1: number): Scale {
	const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
	const scale = ((value: number) => r0 + (value - d0) * k) as Scale;
	scale.invert = (px) => (k === 0 ? d0 : d0 + (px - r0) / k);
	return scale;
}
