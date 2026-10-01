import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import type { DashboardContext } from '../DashboardContext';
import { noteLine } from './noteLine';
import { rowName } from './rowName';
import { subscriptionChip } from './subscriptionChip';

// One transaction inside a card: name, date and account, and `amount`. Click it to open the edit window.
export function transactionItem(parent: HTMLElement, t: Transaction, ctx: DashboardContext, amount: string): void {
	const item = parent.createDiv({ cls: 'afm-item', attr: { tabindex: '0', role: 'button' } });
	const main = item.createDiv({ cls: 'afm-item-main' });
	rowName(main, t);
	const meta = main.createDiv({ cls: 'afm-meta' });
	meta.createSpan({ cls: 'afm-muted', text: `${dayLabel(t.date, ctx.settings.locale)} · ${t.account}` });
	subscriptionChip(meta, t, ctx);
	noteLine(main, t, ctx);
	item.createDiv({ cls: 'afm-item-amount', text: amount });

	item.addEventListener('click', () => ctx.editCategory([t], false));
	item.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter' || e.target !== item) return;
		ctx.editCategory([t], false);
	});
}
