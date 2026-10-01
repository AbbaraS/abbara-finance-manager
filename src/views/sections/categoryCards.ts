import { groupSpending, type SpendGroup } from '../../models/groupSpending';
import { sum } from '../../models/monthSummary';
import { spendOf } from '../../models/rowKind';
import { countLabel } from '../../utils/countLabel';
import { formatMoney } from '../../utils/money';
import { formatPercent } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { shareBar } from './shareBar';
import { subRows } from './subRows';

// Spending by category as a grid of cards, biggest first, each listing its subcategories. People have their own section.
export function categoryCards(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const s = ctx.settings;
	const groups = groupSpending(ctx.rows.filter((t) => t.kind !== 'people'), ctx.month, s, (t) => t.category);
	const toPeople = sum(ctx.rows.filter((t) => t.month === ctx.month && t.kind === 'people').map((t) => spendOf(t, s)));
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No spending this month.' });
		return;
	}

	// Cards.
	const grid = body.createDiv({ cls: 'afm-card-grid' });
	for (const g of groups) categoryCard(grid, g, ctx);

	// Total, and what went to people on top.
	const foot = body.createDiv({ cls: 'afm-grid-foot' });
	foot.createSpan({ text: 'Total' });
	foot.createSpan({ cls: 'afm-strong', text: formatMoney(sum(groups.map((g) => g.total)), s) });
	if (toPeople !== 0) body.createDiv({ cls: 'afm-note', text: `Plus ${formatMoney(toPeople, s)} sent to people (see People). Both count in Spending.` });
}

// One category: icon, name, count and share, total, a bar, then its subcategories.
function categoryCard(grid: HTMLElement, g: SpendGroup, ctx: DashboardContext): void {
	const s = ctx.settings;
	const look = categoryLook(g.key, ctx.labels);
	const card = grid.createDiv({ cls: 'afm-group-card' });
	card.setCssProps({ '--afm-cat': look.color });

	const top = card.createDiv({ cls: 'afm-group-top' });
	iconDot(top, look.icon, look.color);
	const title = top.createDiv({ cls: 'afm-group-title' });
	title.createDiv({ cls: 'afm-strong', text: g.key });
	title.createDiv({ cls: 'afm-muted', text: `${countLabel(g.rows.length)} · ${formatPercent(g.share)}` });
	top.createDiv({ cls: 'afm-group-total', text: formatMoney(g.total, s) });
	shareBar(card, g.share, look.color);

	subRows(card, g.rows, `cat:${g.key}`, ctx, (t) => spendOf(t, s), (v) => formatMoney(v, s));
}
