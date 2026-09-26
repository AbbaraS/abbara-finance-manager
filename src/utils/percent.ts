// 0.256 -> "26%".
export function formatPercent(share: number): string {
	return `${Math.round(share * 100)}%`;
}
