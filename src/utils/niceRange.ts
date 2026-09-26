import { niceScale } from './niceScale';

// Axis range on round steps that covers min..max (works with negatives).
export function niceRange(min: number, max: number, ticks = 4): { min: number; max: number; step: number } {
	const { step } = niceScale(max - min || 1, ticks);
	const lo = Math.floor(min / step) * step;
	const hi = Math.ceil(max / step) * step;
	return { min: lo, max: hi > lo ? hi : lo + step, step };
}
