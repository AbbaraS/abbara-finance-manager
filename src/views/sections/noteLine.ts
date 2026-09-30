import type { Transaction } from '../../models/Transaction';
import { setIconSafe } from '../look/setIconSafe';

// A transaction's tags and note under it. Nothing when it has neither.
export function noteLine(parent: HTMLElement, t: Transaction): void {
	if (!t.note && t.tags.length === 0) return;
	const line = parent.createDiv({ cls: 'afm-note-line' });
	for (const tag of t.tags) line.createSpan({ cls: 'afm-tag', text: `#${tag}` });
	if (!t.note) return;
	setIconSafe(line.createSpan({ cls: 'afm-note-icon' }), 'message-square');
	line.createSpan({ text: t.note });
}
