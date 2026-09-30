import type { Label, Labels } from './Labels';

// Merges changes into one transaction's label; empty values are removed, and so is an empty label.
export function setLabel(labels: Labels, key: string, patch: Label): void {
	const l: Label = { ...labels.transactions[key], ...patch };
	for (const k of Object.keys(l) as (keyof Label)[]) if (!l[k]?.trim()) delete l[k];
	if (Object.keys(l).length === 0) delete labels.transactions[key];
	else labels.transactions[key] = l;
}
