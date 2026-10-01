import { setIcon } from 'obsidian';
import { uncategorised, type UncategorisedGroup } from '../../models/uncategorised';
import { countLabel } from '../../utils/countLabel';
import { formatChange } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { showMore } from './showMore';
import { tableHead } from './tableHead';

// How many rows show before "Show more".
const LIMIT = 10;

// Uncategorised rows grouped by description. Pick a category for one group, or tick several and edit them together.
export function uncategorisedList(body: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const groups = uncategorised(ctx.rows, ctx.month, ctx.settings);
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'Everything is categorised this month.' });
		return;
	}
	body.createDiv({ cls: 'afm-note', text: 'Pick a category; it\'s remembered for that merchant in every month. Tick several to give them one category and subcategory at once.' });

	// Bulk bar: how many are ticked, and a button to edit them together.
	const picked = new Set<UncategorisedGroup>();
	const bar = body.createDiv({ cls: 'afm-bulk' });
	const count = bar.createSpan({ cls: 'afm-muted' });
	const edit = bar.createEl('button', { cls: 'mod-cta', text: 'Edit selected' });
	edit.addEventListener('click', () => ctx.editCategory([...picked].flatMap((g) => g.rows), true));

	// Table.
	const table = body.createEl('table', { cls: 'afm-table afm-pickable' });
	tableHead(table, [
		{ text: '', cls: 'afm-check' },
		{ text: 'Description' },
		{ text: 'In / out', cls: 'afm-num' },
		{ text: '', cls: 'afm-action' },
	]);
	const all = table.querySelector('th')!.createEl('input', { type: 'checkbox', attr: { 'aria-label': 'Select all' } });

	// One row per description, with a tick box.
	const tbody = table.createEl('tbody');
	const boxes: HTMLInputElement[] = [];
	const refresh = () => {
		const rows = [...picked].reduce((a, g) => a + g.rows.length, 0);
		count.setText(picked.size ? `${countLabel(picked.size, 'merchant')} selected (${countLabel(rows)})` : 'None selected');
		edit.disabled = picked.size === 0;
		all.checked = picked.size === groups.length;
		all.indeterminate = picked.size > 0 && picked.size < groups.length;
		groups.forEach((g, i) => { boxes[i].checked = picked.has(g); });
	};
	const toggle = (g: UncategorisedGroup, on: boolean) => { if (on) picked.add(g); else picked.delete(g); };

	const rows = groups.map((g) => {
		const tr = tbody.createEl('tr');
		const box = tr.createEl('td', { cls: 'afm-check' }).createEl('input', { type: 'checkbox' });
		boxes.push(box);
		box.addEventListener('click', (e) => e.stopPropagation());
		box.addEventListener('change', () => { toggle(g, box.checked); refresh(); });
		tr.addEventListener('click', () => { toggle(g, !picked.has(g)); refresh(); }); // clicking the row ticks it

		const name = tr.createEl('td');
		name.createDiv({ text: g.description });
		name.createDiv({ cls: 'afm-muted', text: `${countLabel(g.rows.length)} · ${g.accounts.join(', ')}` });
		tr.createEl('td', { cls: 'afm-num', text: formatChange(g.total, ctx.settings) });
		pickButton(tr.createEl('td', { cls: 'afm-action' }), g, ctx);
		return tr;
	});
	all.addEventListener('change', () => { groups.forEach((g) => toggle(g, all.checked)); refresh(); });

	refresh();
	showMore(body, rows, LIMIT);
}

// Icon button that opens the category picker for the whole group, with "remember" on.
function pickButton(parent: HTMLElement, g: UncategorisedGroup, ctx: DashboardContext): void {
	const btn = parent.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Pick a category for "${g.description}"` } });
	setIcon(btn, 'tag');
	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't tick the row
		ctx.editCategory(g.rows, true);
	});
}
