import { App, FuzzySuggestModal, Notice, Setting } from 'obsidian';
import { findCategory } from '../../models/categories';
import { deleteCounterparty, mergeCounterparty, renameCounterparty, uniqueName } from '../../models/counterparties';
import type { Counterparty, Direction } from '../../models/Counterparty';
import { cleanPatterns } from '../../models/counterpartyMatches';
import { tagNames } from '../../models/Labels';
import { peopleIn } from '../../models/people';
import { tagInput } from '../../edit/tagInput';
import { countLabel } from '../../utils/countLabel';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Labels for the direction dropdown.
const DIRECTIONS: Record<Direction, string> = { '': 'In or out', in: 'Money in', out: 'Money out' };

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
		})
		.addTextArea((t) => {
			t.setPlaceholder('Description contains\n(one per line)').setValue(cp.patterns.join('\n'))
				.onChange((v) => { cp.patterns = cleanPatterns(v.split('\n')); ctx.save(); });
			t.inputEl.rows = Math.min(Math.max(cp.patterns.length, 1), 5);
		})
		.addDropdown((d) => {
			d.addOption('', 'No category');
			for (const c of labels.categories) if (c.kind !== 'people' || c.name === cp.category) d.addOption(c.name, c.name); // people have their own spellings
			d.setValue(cp.category).onChange((v) => { Object.assign(cp, { category: v, person: '', subcategory: v ? cp.subcategory : '' }); ctx.saveAndRedraw(); });
		});
	if (findCategory(labels, cp.category)?.kind === 'people') {
		setting.addDropdown((d) => {
			d.addOption('', 'No person');
			for (const p of new Set([...peopleIn(labels, cp.category), cp.person ?? ''])) if (p) d.addOption(p, p);
			d.setValue(cp.person ?? '').onChange((v) => { cp.person = v; ctx.save(); });
		});
	}
	if (cp.category) {
		setting.addText((t) => {
			t.setPlaceholder('Subcategory').setValue(cp.subcategory ?? '');
			// On Enter / leaving the field, so half-typed names don't become subcategories.
			t.inputEl.addEventListener('change', () => { cp.subcategory = t.getValue().trim(); ctx.save(); });
		});
	}
	setting
		.addDropdown((d) => {
			d.addOption('', 'Any account');
			for (const a of accounts) d.addOption(a, a);
			d.setValue(cp.account).onChange((v) => { cp.account = v; ctx.save(); });
		})
		.addDropdown((d) => d.addOptions(DIRECTIONS).setValue(cp.direction)
			.onChange((v) => { cp.direction = v as Direction; ctx.save(); }));
	tagInput(ctx.app, setting.controlEl, cp.tags ?? [], tagNames(labels), (tags) => { cp.tags = tags; ctx.save(); });
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
