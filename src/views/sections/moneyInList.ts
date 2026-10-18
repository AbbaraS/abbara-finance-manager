import { sum } from '../../models/monthSummary';
import { rowKind } from '../../models/rowKind';
import { newestFirst } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';
import { rowName } from './rowName';

// This month's income as small cards side by side: who paid, how much, when and into which account, and its category.
// Money from people is under People, refunds under Spending by category, uncategorised money in under Uncategorised.
export function moneyInList(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const rows = ctx.rows.filter((t) => t.month === ctx.month && rowKind(t, s) === 'income');
	if (rows.length === 0) return void body.createDiv({ cls: 'afm-muted', text: 'No income this month.' });

	// Cards; click one to open it.
	const grid = body.createDiv({ cls: 'afm-income-cards' });
	for (const t of newestFirst(rows)) {
		const card = grid.createDiv({ cls: 'afm-income-card afm-clickable', attr: { tabindex: '0', role: 'button' } });
		const top = card.createDiv({ cls: 'afm-income-top' });
		rowName(top, t, s);
		top.createDiv({ cls: 'afm-income-amount', text: formatMoney(t.amount, s) });
		card.createDiv({ cls: 'afm-muted afm-income-meta', text: `${dayLabel(t.date, s.locale)} · into ${t.account}` });
		categoryButton(card, t, ctx);
		noteLine(card, t, ctx);
		card.addEventListener('click', () => ctx.editCategory([t], false));
		card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === card) ctx.editCategory([t], false); });
	}

	// Total.
	const foot = body.createDiv({ cls: 'afm-grid-foot' });
	foot.createSpan({ text: 'Income' });
	foot.createSpan({ cls: 'afm-strong afm-flow-in', text: formatMoney(sum(rows.map((t) => t.amount)), s) });
}
