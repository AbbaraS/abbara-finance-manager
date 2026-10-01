// 1 -> "1 transaction", 5 -> "5 transactions". `plural` for words that don't just add an s.
export function countLabel(count: number, word = 'transaction', plural = `${word}s`): string {
	return `${count} ${count === 1 ? word : plural}`;
}
