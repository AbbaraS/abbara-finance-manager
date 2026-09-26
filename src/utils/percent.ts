// 0.256 -> "26%".
export function formatPercent(share: number): string {
	return `${Math.round(share * 100)}%`;
}

// 0.35 -> "+35%", -0.2 -> "−20%".
export function formatPercentChange(ratio: number): string {
	const sign = ratio > 0 ? '+' : ratio < 0 ? '−' : '';
	return `${sign}${Math.abs(Math.round(ratio * 100))}%`;
}
