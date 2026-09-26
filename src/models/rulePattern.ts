// Guesses a rule pattern: "COSTA COFFEE 43010" -> "COSTA COFFEE", "Amazon* 3V2No9C65, London" -> "Amazon*".
export function rulePattern(description: string): string {
	const [head, ...rest] = description.split(',');
	const tail = rest.join(',').trim();
	const words = head.trim().split(/\s+/);
	const before = words.length;
	while (words.length > 0 && /\d/.test(words[words.length - 1])) words.pop(); // drop trailing refs

	// Drop the part after the comma only if it looks like a town or a ref was removed.
	const cutTail = tail === '' || words.length < before || !/\s/.test(tail);
	const pattern = cutTail ? words.join(' ') : description.trim();
	return pattern || description.trim(); // all numbers: keep the whole thing
}
