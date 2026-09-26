import { setTooltip } from 'obsidian';
import type { MonthTotal } from '../../models/monthlyTotals';
import { monthLabel } from '../../utils/dates';
import { formatChange, formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';

// One month: two bars (income, spending) and a label. It's a button, so click, Tab and Enter all work.
export function monthColumn(parent: HTMLElement, t: MonthTotal, max: number, ctx: DashboardContext): void {
	const s = ctx.settings;
	const col = parent.createEl('button', { cls: 'afm-col' });
	col.toggleClass('is-selected', t.month === ctx.month);

	// Bars: height is a % of the chart's max.
	const bars = col.createDiv({ cls: 'afm-col-bars' });
	for (const [value, cls] of [[t.income, 'afm-income'], [t.spending, 'afm-spend']] as const) {
		const bar = bars.createDiv({ cls: `afm-col-bar ${cls}` });
		bar.setCssStyles({ height: `${(Math.max(value, 0) / max) * 100}%` });
	}
	col.createDiv({ cls: 'afm-col-label', text: monthLabel(t.month, s.locale, true) });

	// Hover text + screen reader label.
	const text = `${monthLabel(t.month, s.locale)} · Income ${formatMoney(t.income, s)} · Spending ${formatMoney(t.spending, s)} · Net ${formatChange(t.income - t.spending, s)}`;
	setTooltip(col, text, { placement: 'top' });
	col.addEventListener('click', () => ctx.selectMonth(t.month));
}
