// 1 -> "1 transaction", 5 -> "5 transactions".
export function countLabel(count: number, word = 'transaction'): string {
	return `${count} ${word}${count === 1 ? '' : 's'}`;
}
