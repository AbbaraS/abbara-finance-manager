import { AVERAGE_MONTHS, compareMonths } from '../../models/compareMonths';
import { isCurrentMonth, monthLabel, previousMonths } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import { formatPercentChange } from '../../utils/percent';
import type { DashboardContext } from '../DashboardContext';
import { categoryLook } from '../look/categoryLook';
import { iconDot } from '../look/iconDot';
import { changeBar } from './changeBar';
import { changeValue } from './changeValue';
import { section } from './section';
import { showMore } from './showMore';
import { tableHead } from './tableHead';

// How many categories show before "Show more".
const LIMIT = 8;

// Each category this month vs last month and vs the recent average.
export function comparison(el: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const changes = compareMonths(ctx.rows, ctx.month, ctx.settings);
	const [last] = previousMonths(ctx.month, 1);
	const s = ctx.settings;
	const body = section(el, `Compared with ${monthLabel(last, s.locale)}`, 'git-compare-arrows');
	if (changes.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No spending in either month.' });
		return;
	}

	// Notes that change how to read the numbers.
	if (isCurrentMonth(ctx.month)) {
		body.createDiv({ cls: 'afm-note', text: 'This month isn\'t finished yet, so most categories will look lower.' });
	}
	body.createDiv({ cls: 'afm-note', text: `Average = the ${AVERAGE_MONTHS} months before this one.` });

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Category' },
		{ text: 'This month', cls: 'afm-num' },
		{ text: 'Last month', cls: 'afm-num afm-narrow-hide' },
		{ text: 'Change', cls: 'afm-bar-cell' },
		{ text: '', cls: 'afm-num' },
		{ text: 'vs average', cls: 'afm-num' },
	]);

	// One row per category; bars share one scale so they compare fairly.
	const scale = Math.max(...changes.map((c) => Math.abs(c.change)));
	const tbody = table.createEl('tbody');
	const rows = changes.map((c) => {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td').createDiv({ cls: 'afm-row-title' });
		const look = categoryLook(c.category);
		iconDot(name, look.icon, look.color);
		name.createSpan({ text: c.category });
		tr.createEl('td', { cls: 'afm-num', text: formatMoney(c.thisMonth, s) });
		tr.createEl('td', { cls: 'afm-num afm-muted afm-narrow-hide', text: formatMoney(c.lastMonth, s) });
		changeBar(tr.createEl('td', { cls: 'afm-bar-cell' }), c.change, scale);
		changeValue(tr.createEl('td', { cls: 'afm-num' }), c.change, s);
		tr.createEl('td', { cls: 'afm-num afm-muted', text: c.vsAverage === null ? 'new' : formatPercentChange(c.vsAverage) });
		return tr;
	});

	showMore(body, rows, LIMIT);
}
