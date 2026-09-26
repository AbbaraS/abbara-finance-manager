import { monthSummary } from '../../models/monthSummary';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';

// Example section: income, spending and net for the month.
export function summaryCards(el: HTMLElement, ctx: DashboardContext): void {
	// 1. Get the numbers from a model function (pure, no DOM).
	const s = monthSummary(ctx.rows, ctx.month, ctx.settings);

	// 2. Build the DOM with createDiv / createEl.
	const cards = el.createDiv({ cls: 'afm-cards' });
	card(cards, 'Income', formatMoney(s.income, ctx.settings));
	card(cards, 'Spending', formatMoney(s.spending, ctx.settings));
	const net = card(cards, 'Net', formatMoney(s.net, ctx.settings));
	net.toggleClass('afm-negative', s.net < 0); // 3. State as a CSS class, colour lives in styles.css

	// Note about rows left out.
	if (s.otherCurrency > 0) {
		el.createDiv({ cls: 'afm-note', text: `${s.otherCurrency} rows in other currencies not counted.` });
	}
}

// One card; returns the value element so callers can style it.
function card(parent: HTMLElement, label: string, value: string): HTMLElement {
	const box = parent.createDiv({ cls: 'afm-card' });
	box.createDiv({ cls: 'afm-card-label', text: label });
	return box.createDiv({ cls: 'afm-card-value', text: value });
}
