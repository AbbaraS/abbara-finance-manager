import type { Counterparty } from './Counterparty';
import { cleanPatterns } from './counterpartyMatches';
import { setLabel, type Labels } from './Labels';

// Finding, naming, renaming, merging and deleting counterparties.

// A counterparty by name.
export function findCounterparty(labels: Labels, name: string): Counterparty | undefined {
	return labels.counterparties.find((x) => x.name === name);
}

// `name`, or "name 2", "name 3"... if it's taken.
export function uniqueName(labels: Labels, name: string): string {
	const base = name.trim() || 'Counterparty';
	let out = base;
	for (let n = 2; labels.counterparties.some((x) => x.name.toLowerCase() === out.toLowerCase()); n++) out = `${base} ${n}`;
	return out;
}

// Renames a counterparty, its subscriptions and the transactions picked for it by hand.
export function renameCounterparty(labels: Labels, cp: Counterparty, to: string): void {
	for (const l of Object.values(labels.transactions)) if (l.counterparty === cp.name) l.counterparty = to;
	for (const s of labels.subscriptions) if (s.counterparty === cp.name) s.counterparty = to;
	cp.name = to;
}

// Moves a counterparty's spellings, subscriptions and hand-picked transactions into another, then removes it.
export function mergeCounterparty(labels: Labels, from: Counterparty, into: Counterparty): void {
	into.patterns = cleanPatterns([...into.patterns, ...from.patterns]);
	for (const s of labels.subscriptions) if (s.counterparty === from.name) s.counterparty = into.name;
	for (const l of Object.values(labels.transactions)) if (l.counterparty === from.name) l.counterparty = into.name;
	labels.counterparties = labels.counterparties.filter((x) => x !== from);
}

// Deletes a counterparty; its hand-picked transactions go back to being found by patterns,
// and its subscriptions keep only their match text.
export function deleteCounterparty(labels: Labels, cp: Counterparty): void {
	for (const s of labels.subscriptions) if (s.counterparty === cp.name) s.counterparty = '';
	labels.counterparties = labels.counterparties.filter((x) => x !== cp);
	for (const [id, l] of Object.entries(labels.transactions)) if (l.counterparty === cp.name) setLabel(labels, id, { counterparty: '' });
}
