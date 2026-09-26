// Quotes a CSV field only when it needs it: a,b -> "a,b" and a"b -> "a""b".
export function csvField(text: string): string {
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
