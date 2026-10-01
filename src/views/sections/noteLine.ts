import { tagInput } from '../../edit/tagInput';
import { tagNames } from '../../models/Labels';
import type { Transaction } from '../../models/Transaction';
import type { DashboardContext } from '../DashboardContext';
import { setIconSafe } from '../look/setIconSafe';

// A transaction's tags and note under it, with a "+ tag" button (shown on hover) that opens a tag box.
export function noteLine(parent: HTMLElement, t: Transaction, ctx: DashboardContext): void {
	const key = `tags:${t.id}`; // open tag boxes stay open across redraws
	const open = ctx.expanded.has(key);
	const line = parent.createDiv({ cls: 'afm-note-line' });
	line.addEventListener('click', (e) => e.stopPropagation()); // typing tags doesn't open the row

	// Tags: plain, or the tag box while editing.
	if (open) {
		const input = tagInput(ctx.app, line, t.tags, tagNames(ctx.labels), (tags) => ctx.saveLabel(t, { tags }));
		window.setTimeout(() => input.focus(), 0);
	} else {
		for (const tag of t.tags) line.createSpan({ cls: 'afm-tag', text: `#${tag}` });
	}
	const btn = line.createEl('button', { cls: `afm-tag-button${open ? ' is-open' : ''}`, text: open ? 'Done' : '+ tag' });
	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't toggle the row it sits in
		if (open) ctx.expanded.delete(key);
		else ctx.expanded.add(key);
		ctx.redraw();
	});

	// Note.
	if (!t.note) return;
	setIconSafe(line.createSpan({ cls: 'afm-note-icon' }), 'message-square');
	line.createSpan({ text: t.note });
}
