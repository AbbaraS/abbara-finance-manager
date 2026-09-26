import { setIcon, setTooltip } from 'obsidian';
import { UNCATEGORISED } from '../../models/rowKind';
import type { Transaction } from '../../models/Transaction';
import type { DashboardContext } from '../DashboardContext';

// Hover text for where the category came from.
const SOURCE_TIP = { edit: 'One-off edit', rule: 'Set by a rule', none: 'No rule matches' };

// A small chip showing a transaction's category; click to change it.
export function categoryButton(parent: HTMLElement, t: Transaction, ctx: DashboardContext): void {
	const btn = parent.createEl('button', { cls: 'afm-chip' });
	btn.toggleClass('is-uncategorised', t.category === UNCATEGORISED);
	btn.toggleClass('is-edited', t.source === 'edit');
	btn.createSpan({ text: t.category });
	setIcon(btn.createSpan({ cls: 'afm-chip-icon' }), 'chevron-down');
	setTooltip(btn, `${SOURCE_TIP[t.source]}. Click to change.`);

	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't toggle the row it sits in
		ctx.editCategory([t], false);
	});
}
