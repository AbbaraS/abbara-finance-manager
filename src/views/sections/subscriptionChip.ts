import { setTooltip } from 'obsidian';
import type { Transaction } from '../../models/Transaction';
import type { DashboardContext } from '../DashboardContext';
import { setIconSafe } from '../look/setIconSafe';
import { statusBadge } from '../look/statusBadge';

// "↻ 4/10" next to a subscription payment (its name is the row's name), with its status; click to edit the transaction.
export function subscriptionChip(parent: HTMLElement, t: Transaction, ctx: DashboardContext): void {
	if (!t.subscription) return;
	const sub = ctx.labels.subscriptions.find((s) => s.name === t.subscription);
	const btn = parent.createEl('button', { cls: 'afm-sub-chip' });
	setIconSafe(btn.createSpan({ cls: 'afm-sub-chip-icon' }), 'repeat');
	if (t.payment) btn.createSpan({ cls: 'afm-sub-chip-count', text: sub?.payments ? `${t.payment}/${sub.payments}` : `#${t.payment}` });
	if (sub) statusBadge(btn, sub.status);
	setTooltip(btn, `${t.subscription}${t.counterparty ? ` (${t.counterparty})` : ''}. Click to change it.`);
	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't toggle the row it sits in
		ctx.editCategory([t], false);
	});
}
