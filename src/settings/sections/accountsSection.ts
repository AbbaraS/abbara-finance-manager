import { Notice, Setting } from 'obsidian';
import { COLOR_NAMES } from '../../models/colors';
import type { Direction } from '../../models/Counterparty';
import type { Account } from '../../models/Labels';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Labels for the direction dropdown.
const DIRECTIONS: Record<Direction, string> = { '': 'In and out', in: 'Money in', out: 'Money out' };

// Your accounts, in your order (also the order of the Transfer links cards): name, colour, icon, and the text
// that means a transaction is a transfer to or from it. Ones with statements come from myFinances.
export function accountsSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	new Setting(el)
		.setName('Accounts')
		.setDesc('Colour and icon are used across the dashboard. Patterns: text in a description that means the money went to or came from this account (e.g. its sort code).')
		.setHeading();

	const inData = new Set(ctx.rows.map((t) => t.account));
	labels.accounts.forEach((a, i) => {
		const row = new Setting(el).setDesc(inData.has(a.name) ? 'Has statements' : 'Added, no statements');
		row.addText((t) => t.setPlaceholder('Name').setValue(a.name).onChange((v) => {
			const name = v.trim();
			if (!name || labels.accounts.some((x) => x !== a && x.name === name)) return;
			for (const l of Object.values(labels.transactions)) if (l.other === a.name) l.other = name;
			for (const x of labels.accounts) for (const p of x.patterns) if (p.inAccount === a.name) p.inAccount = name;
			for (const r of labels.counterparties) if (r.account === a.name) r.account = name;
			a.name = name;
			ctx.save();
		}));
		row.addDropdown((d) => {
			d.addOption('', 'Colour: auto');
			for (const c of COLOR_NAMES) d.addOption(c, c[0].toUpperCase() + c.slice(1));
			d.setValue(a.color).onChange((v) => { a.color = v; ctx.save(); });
		});
		row.addText((t) => t.setPlaceholder('Icon (Lucide name)').setValue(a.icon).onChange((v) => { a.icon = v.trim(); ctx.save(); }));
		row.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0).onClick(() => move(labels.accounts, i, -1, ctx)));
		row.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === labels.accounts.length - 1).onClick(() => move(labels.accounts, i, 1, ctx)));
		if (!inData.has(a.name)) confirmDelete(row, 'Remove account', () => {
			labels.accounts = labels.accounts.filter((x) => x !== a);
			ctx.saveAndRedraw();
		});
		patternList(collapsible(el, ctx, `account:${a.name}`, `${a.name}: ${a.patterns.length} pattern${a.patterns.length === 1 ? '' : 's'}`), a, ctx);
	});

	// Add one without statements (yet), so transfers to it have a home.
	let name = '';
	new Setting(el)
		.addText((t) => t.setPlaceholder('New account, e.g. Monzo').onChange((v) => (name = v.trim())))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (labels.accounts.some((a) => a.name === name)) return void new Notice(`"${name}" already exists.`);
			labels.accounts.push({ name, color: '', icon: '', patterns: [] });
			ctx.saveAndRedraw();
		}));
}

// One account's patterns: text, which statements to look in, which way the money goes; delete; add.
function patternList(box: HTMLElement, a: Account, ctx: SettingsContext): void {
	const names = ctx.plugin.db.labels.accounts.map((x) => x.name);
	a.patterns.forEach((p) => {
		new Setting(box)
			.addText((t) => t.setPlaceholder('Text in the description').setValue(p.text).onChange((v) => { p.text = v; ctx.save(); }))
			.addDropdown((d) => {
				d.addOption('', 'In any account');
				for (const n of names) if (n !== a.name) d.addOption(n, `Only in ${n}`);
				d.setValue(p.inAccount).onChange((v) => { p.inAccount = v; ctx.save(); });
			})
			.addDropdown((d) => d.addOptions(DIRECTIONS).setValue(p.direction).onChange((v) => { p.direction = v as Direction; ctx.save(); }))
			.addExtraButton((b) => b.setIcon('trash').setTooltip('Remove').onClick(() => {
				a.patterns = a.patterns.filter((x) => x !== p);
				ctx.saveAndRedraw();
			}));
	});
	new Setting(box).addButton((b) => b.setButtonText('Add pattern').onClick(() => {
		a.patterns.push({ text: '', inAccount: '', direction: '' });
		ctx.redraw();
	}));
}

// Moves an account up or down the list.
function move(list: Account[], i: number, by: number, ctx: SettingsContext): void {
	const [a] = list.splice(i, 1);
	list.splice(i + by, 0, a);
	ctx.saveAndRedraw();
}
