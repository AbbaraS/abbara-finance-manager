import { categoryNames } from '../../models/categoryNames';
import { rulePattern } from '../../models/rulePattern';
import { uncategorised } from '../../models/uncategorised';
import { countLabel } from '../../utils/countLabel';
import { formatChange } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { copyRuleButton } from './copyRuleButton';
import { section } from './section';
import { showMore } from './showMore';
import { tableHead } from './tableHead';

// How many rows show before "Show more".
const LIMIT = 10;

// Uncategorised rows grouped by description, with a button to copy a rule for each.
export function uncategorisedList(el: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const groups = uncategorised(ctx.rows, ctx.month, ctx.settings);
	const categories = categoryNames(ctx.rows);
	const body = section(el, 'Uncategorised');
	if (groups.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'Everything is categorised this month.' });
		return;
	}
	body.createDiv({ cls: 'afm-note', text: 'Copy a rule, paste it into category_patterns.csv, then run make.' });

	// Table.
	const table = body.createEl('table', { cls: 'afm-table' });
	tableHead(table, [
		{ text: 'Description' },
		{ text: 'In / out', cls: 'afm-num' },
		{ text: 'Rule', cls: 'afm-action' },
	]);

	// One row per description.
	const tbody = table.createEl('tbody');
	const rows = groups.map((g) => {
		const tr = tbody.createEl('tr');
		const name = tr.createEl('td');
		name.createDiv({ text: g.description });
		name.createDiv({ cls: 'afm-muted', text: `${countLabel(g.count)} · ${g.accounts.join(', ')}` });
		tr.createEl('td', { cls: 'afm-num', text: formatChange(g.total, ctx.settings) });
		copyRuleButton(tr.createEl('td', { cls: 'afm-action' }), rulePattern(g.description), categories);
		return tr;
	});

	showMore(body, rows, LIMIT);
}
