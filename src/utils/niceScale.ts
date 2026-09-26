// Round axis steps (1, 2 or 5 × 10ⁿ) so gridlines land on tidy numbers.
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
	if (max <= 0) return { max: 1, step: 1 };
	const rough = max / ticks;
	const power = 10 ** Math.floor(Math.log10(rough));
	const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
	return { max: Math.ceil(max / step) * step, step };
}
