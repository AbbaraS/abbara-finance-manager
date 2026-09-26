import { setIcon } from 'obsidian';
import { uncategorised, type UncategorisedGroup } from '../../models/uncategorised';
import { countLabel } from '../../utils/countLabel';
import { formatChange } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { section } from './section';
import { showMore } from './showMore';
import { tableHead } from './tableHead';

// How many rows show before "Show more".
const LIMIT = 10;

// Uncategorised rows grouped by description, each with a button to pick a category.
export function uncategorisedList(el: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const groups = uncategorised(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Uncategorised');
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'Everything is categorised this month.' });
		return;
	}
	body.createDiv({ cls: 'afm-note', text: 'Pick a category to add a rule; it applies to every month.' });

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Description' },
		{ text: 'In / out', cls: 'afm-num' },
		{ text: '', cls: 'afm-action' },
	]);

	// One row per description.
	const tbody = table.createEl('tbody');
	const rows = groups.map((g) => {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		name.createDiv({ text: g.description });
		name.createDiv({ cls: 'afm-muted', text: `${countLabel(g.rows.length)} · ${g.accounts.join(', ')}` });
		tr.createEl('td', { cls: 'afm-num', text: formatChange(g.total, ctx.settings) });
		pickButton(tr.createEl('td', { cls: 'afm-action' }), g, ctx);
		return tr;
	});

	showMore(body, rows, LIMIT);
}

// Icon button that opens the category picker for the whole group, with "similar" on.
function pickButton(parent: HTMLElement, g: UncategorisedGroup, ctx: DashboardContext): void {
	const btn = parent.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Pick a category for "${g.description}"` } });
	setIcon(btn, 'tag');
	btn.addEventListener('click', () => ctx.editCategory(g.rows, true));
}
