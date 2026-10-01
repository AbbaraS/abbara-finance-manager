import { setTooltip } from 'obsidian';
import { setIconSafe } from '../look/setIconSafe';
import { UNCATEGORISED } from '../../models/rowKind';
import type { Transaction } from '../../models/Transaction';
import type { DashboardContext } from '../DashboardContext';
import { badge } from '../look/badge';

// Hover text for where the category came from.
const SOURCE_TIP = { edit: 'One-off edit', rule: 'Remembered merchant', pair: 'Other side of a transfer', none: 'No merchant matches' };

// A transaction's category badge; click to edit the transaction.
export function categoryButton(parent: HTMLElement, t: Transaction, ctx: DashboardContext): void {
	const sub = [t.person, t.subcategory].filter(Boolean).join(' › ');
	const btn = badge(parent, t.category, ctx.labels, sub, 'button', t.amount);
	btn.toggleClass('is-uncategorised', t.category === UNCATEGORISED);
	btn.toggleClass('is-edited', t.source === 'edit');
	setIconSafe(btn.createSpan({ cls: 'afm-badge-chevron' }), 'chevron-down');
	setTooltip(btn, `${SOURCE_TIP[t.source]}. Click to edit.`);

	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't toggle the row it sits in
		ctx.editCategory([t], false);
	});
}
