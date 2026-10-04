import { App, FuzzySuggestModal, Notice, Setting } from 'obsidian';
import { addSubcategory, findCategory } from '../../models/categories';
import { deleteCounterparty, mergeCounterparty, renameCounterparty, uniqueName } from '../../models/counterparties';
import type { Counterparty, Direction } from '../../models/Counterparty';
import { cleanPatterns } from '../../models/counterpartyMatches';
import { tagNames } from '../../models/Labels';
import { peopleIn } from '../../models/people';
import { subcategoryNames } from '../../models/subcategoryNames';
import { tagInput } from '../../edit/tagInput';
import { countLabel } from '../../utils/countLabel';
import { caption } from '../caption';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Labels for the direction dropdown.
const DIRECTIONS: Record<Direction, string> = { '': 'In or out', in: 'Money in', out: 'Money out' };

// Dropdown value that asks for a new subcategory's name.
const NEW_SUB = '\u0000new';

// Counterparties: who transactions are with, collapsed, with a filter and edit fields.
export function counterpartiesSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	new Setting(el)
		.setName('Counterparties')
		.setDesc('Who a transaction is with (a shop, service or employer); its name is shown instead of the description. Found by its spellings, one per line, checked top to bottom: the first match wins. With a category, its transactions get it too; one-off edits beat it. Its tags go on every transaction it finds. Add spellings from the edit window with "Remember for this counterparty".')
		.setHeading();

	// Collapsed list, so it doesn't push the rest of the page down.
	const list = collapsible(el, ctx, 'counterparties', `Show ${countLabel(labels.counterparties.length, 'counterparty', 'counterparties')}`);

	// Filter + add.
	const rows: { el: HTMLElement; text: string }[] = [];
	new Setting(list)
		.addSearch((q) => q.setPlaceholder('Filter counterparties').onChange((v) => {
			const f = v.trim().toLowerCase();
			rows.forEach((r) => r.el.toggleClass('afm-hidden', !r.text.includes(f)));
		}))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			labels.counterparties.unshift({ name: uniqueName(labels, 'New counterparty'), patterns: [], category: '', subcategory: '', account: '', direction: '' });
			ctx.saveAndRedraw();
		}));

	const used = new Map<string, number>();
	for (const t of ctx.rows) if (t.counterparty) used.set(t.counterparty, (used.get(t.counterparty) ?? 0) + 1);
	labels.counterparties.forEach((cp, i) => {
		const row = counterpartyRow(list, cp, i, used.get(cp.name) ?? 0, ctx);
		rows.push({ el: row, text: `${cp.name} ${cp.patterns.join(' ')} ${(cp.tags ?? []).join(' ')} ${cp.category} ${cp.person ?? ''} ${cp.subcategory ?? ''} ${cp.account}`.toLowerCase() });
	});
}

// One counterparty: name, spellings, category (+ person under People, subcategory), account, direction, tags, then up / down / merge / delete.
function counterpartyRow(el: HTMLElement, cp: Counterparty, i: number, used: number, ctx: SettingsContext): HTMLElement {
	const labels = ctx.plugin.db.labels;
	const all = labels.counterparties;
	const accounts = [...new Set([...ctx.accounts, cp.account])].filter(Boolean);
	const setting = new Setting(el)
		.setClass('afm-wrap')
		.setName(`${i + 1}.`)
		.setDesc(used ? `Finds ${countLabel(used)}` : cp.patterns.some((p) => p.trim()) ? 'Finds nothing yet' : 'No spellings: finds nothing')
		.addText((t) => {
			t.setPlaceholder('Name').setValue(cp.name);
			t.inputEl.addEventListener('change', () => { // on Enter / leaving the field
				const to = t.getValue().trim();
				if (!to || to === cp.name) return t.setValue(cp.name);
				if (all.some((x) => x !== cp && x.name.toLowerCase() === to.toLowerCase())) { new Notice(`"${to}" already exists. Merge them instead.`); return t.setValue(cp.name); }
				shownSwap(ctx, cp.name, to);
				renameCounterparty(labels, cp, to);
				ctx.saveAndRedraw();
			});
		});
	caption(setting, 'Name (shown on transactions)');
	setting
		.addTextArea((t) => {
			t.setPlaceholder('Description contains\n(one per line)').setValue(cp.patterns.join('\n'))
				.onChange((v) => { cp.patterns = cleanPatterns(v.split('\n')); ctx.save(); });
			t.inputEl.rows = Math.min(Math.max(cp.patterns.length, 1), 5);
		});
	caption(setting, 'Spellings (description contains)');
	setting
		.addDropdown((d) => {
			d.addOption('', 'No category');
			for (const c of labels.categories) if (c.kind !== 'people' || c.name === cp.category) d.addOption(c.name, c.name); // people have their own spellings
			// A new category has other subcategories, so the old one goes.
			d.setValue(cp.category).onChange((v) => { Object.assign(cp, { category: v, person: '', subcategory: '' }); ctx.saveAndRedraw(); });
		});
	caption(setting, 'Category');
	const isPeople = findCategory(labels, cp.category)?.kind === 'people';
	if (isPeople) {
		setting.addDropdown((d) => {
			d.addOption('', 'No person');
			for (const p of new Set([...peopleIn(labels, cp.category), cp.person ?? ''])) if (p) d.addOption(p, p);
			d.setValue(cp.person ?? '').onChange((v) => { Object.assign(cp, { person: v, subcategory: '' }); ctx.saveAndRedraw(); }); // each person has their own
		});
		caption(setting, 'Person');
	}
	if (cp.category) {
		setting.addDropdown((d) => subcategoryDropdown(d.selectEl, cp, isPeople ? cp.person ?? '' : '', ctx));
		caption(setting, 'Subcategory');
	}
	setting.addDropdown((d) => {
		d.addOption('', 'Any account');
		for (const a of accounts) d.addOption(a, a);
		d.setValue(cp.account).onChange((v) => { cp.account = v; ctx.save(); });
	});
	caption(setting, 'Only in account');
	setting.addDropdown((d) => d.addOptions(DIRECTIONS).setValue(cp.direction)
		.onChange((v) => { cp.direction = v as Direction; ctx.save(); }));
	caption(setting, 'Money');
	tagInput(ctx.app, setting.controlEl, cp.tags ?? [], tagNames(labels), (tags) => { cp.tags = tags; ctx.save(); });
	caption(setting, 'Tags');
	setting
		.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0)
			.onClick(() => move(all, i, -1, ctx)))
		.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === all.length - 1)
			.onClick(() => move(all, i, 1, ctx)))
		.addExtraButton((b) => b.setIcon('git-merge').setTooltip('Merge into another counterparty (its spellings move there)')
			.onClick(() => new MergeModal(ctx.app, cp, ctx).open()));
	confirmDelete(setting, 'Delete counterparty', () => {
		shownSwap(ctx, cp.name, '');
		deleteCounterparty(labels, cp);
		ctx.saveAndRedraw();
	});
	return setting.settingEl;
}

// The category's subcategories (the person's own under People), plus "+ New subcategory…", which swaps in a text box for the name.
function subcategoryDropdown(select: HTMLSelectElement, cp: Counterparty, person: string, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	const names = new Set([...subcategoryNames(cp.category, person, labels, ctx.rows), cp.subcategory ?? '']);
	select.createEl('option', { value: '', text: 'No subcategory' });
	for (const n of names) if (n) select.createEl('option', { value: n, text: n });
	select.createEl('option', { value: NEW_SUB, text: '+ New subcategory…' });
	select.value = cp.subcategory ?? '';

	select.addEventListener('change', () => {
		if (select.value !== NEW_SUB) {
			cp.subcategory = select.value;
			return ctx.save();
		}
		select.addClass('afm-hidden');
		const input = select.parentElement!.createEl('input', { type: 'text', attr: { placeholder: 'New subcategory name' } });
		input.focus();
		// Enter or leaving the box: add it (empty = keep the old one).
		input.addEventListener('blur', () => {
			const name = input.value.trim();
			if (name) {
				addSubcategory(labels, cp.category, name, person);
				cp.subcategory = name;
			}
			ctx.saveAndRedraw();
		});
		input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
	});
}

// Swaps a counterparty with its neighbour.
function move(list: Counterparty[], i: number, step: number, ctx: SettingsContext): void {
	const j = i + step;
	if (j < 0 || j >= list.length) return;
	[list[i], list[j]] = [list[j], list[i]];
	ctx.saveAndRedraw();
}

// Keeps "Counterparties on the dashboard" in step: `from` becomes `to`, or is dropped when `to` is empty.
function shownSwap(ctx: SettingsContext, from: string, to: string): void {
	const s = ctx.plugin.settings;
	s.shownCounterparties = [...new Set(s.shownCounterparties.map((n) => (n === from ? to : n)).filter(Boolean))];
}

// Picker for the counterparty to merge into; the other one keeps its name, category and conditions.
class MergeModal extends FuzzySuggestModal<Counterparty> {
	constructor(app: App, private from: Counterparty, private ctx: SettingsContext) {
		super(app);
		this.setPlaceholder(`Merge ${from.name} into…`);
	}

	getItems(): Counterparty[] {
		return this.ctx.plugin.db.labels.counterparties.filter((x) => x !== this.from).sort((a, b) => a.name.localeCompare(b.name));
	}

	getItemText(cp: Counterparty): string {
		return cp.name;
	}

	onChooseItem(into: Counterparty): void {
		shownSwap(this.ctx, this.from.name, into.name);
		mergeCounterparty(this.ctx.plugin.db.labels, this.from, into);
		this.ctx.saveAndRedraw();
	}
}
