import type { Labels } from '../models/Labels';

// Current labels file version.
export const LABELS_VERSION = 1;

// A labels file with nothing in it yet.
export function emptyLabels(): Labels {
	return { version: LABELS_VERSION, transactions: {}, rules: [] };
}
