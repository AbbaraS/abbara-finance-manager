import { invested } from '../../models/invested';
import { monthSummary } from '../../models/monthSummary';
import { incomeOf } from '../../models/rowKind';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { iconDot } from '../look/iconDot';

// Income (by income category), spending, net for the month, plus money saved and invested (all time).
export function summaryCards(body: HTMLElement, ctx: DashboardContext): void {
	const s = ctx.settings;
	const m = monthSummary(ctx.rows, ctx.month, s);
	const cards = body.createDiv({ cls: 'afm-cards' });

	// Income, with each income category under it (no refunds or money from people).
	const income = card(cards, 'Income', formatMoney(m.income, s), 'arrow-down-left', 'var(--afm-income)');
	const sources = new Map<string, number>();
	for (const t of ctx.rows) if (t.month === ctx.month && incomeOf(t, s)) sources.set(t.category, (sources.get(t.category) ?? 0) + incomeOf(t, s));
	if (sources.size === 0) income.extra.setText('No income this month');
	for (const [name, total] of [...sources].sort((a, b) => b[1] - a[1])) {
		const line = income.extra.createDiv({ cls: 'afm-card-line' });
		line.createSpan({ text: name });
		line.createSpan({ text: formatMoney(total, s) });
	}

	card(cards, 'Spending', formatMoney(m.spending, s), 'arrow-up-right', 'var(--afm-spend)');
	const net = card(cards, 'Net', formatMoney(m.net, s), m.net < 0 ? 'trending-down' : 'trending-up',
		m.net < 0 ? 'var(--afm-c-red)' : 'var(--afm-c-green)');
	net.value.toggleClass('afm-negative', m.net < 0);

	// Saved & invested (all time).
	const inv = invested(ctx.rows, ctx.month, s);
	const box = card(cards, 'Saved & invested (all time)', formatMoney(inv.total, s), 'sprout', 'var(--afm-c-violet)');
	box.extra.setText(inv.thisMonth ? `${formatChange(inv.thisMonth, s)} this month` : 'Nothing this month');
	const subs = inv.bySub.filter((x) => x.total !== 0).slice(0, 3);
	if (subs.length > 1) box.extra.createDiv({ text: subs.map((x) => `${x.name} ${formatMoney(x.total, s)}`).join(' · ') });

	// Note about rows left out.
	if (m.otherCurrency > 0) {
		body.createDiv({ cls: 'afm-note', text: `${m.otherCurrency} rows in other currencies not counted.` });
	}
}

// One card with a coloured icon; returns its value and small-print elements.
function card(parent: HTMLElement, label: string, value: string, icon: string, color: string) {
	const box = parent.createDiv({ cls: 'afm-card' });
	box.setCssProps({ '--afm-cat': color });
	const top = box.createDiv({ cls: 'afm-card-top' });
	iconDot(top, icon, color);
	top.createDiv({ cls: 'afm-card-label', text: label });
	return {
		value: box.createDiv({ cls: 'afm-card-value', text: value }),
		extra: box.createDiv({ cls: 'afm-card-extra' }),
	};
}
