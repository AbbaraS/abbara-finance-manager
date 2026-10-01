import { App, FuzzySuggestModal, Setting } from 'obsidian';
import { moveSection, orderedSections } from '../../models/sections';
import { setIconSafe } from '../../views/look/setIconSafe';
import type { SettingsContext } from '../context';

// Dashboard sections in page order: a toggle each, with up / down to move them. Then the counterparties to show.
export function sectionsSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el).setName('Dashboard sections').setDesc('Shown in this order. You can also drag a section by its grip on the dashboard, and click its title to collapse it.').setHeading();

	const list = orderedSections(s.sectionOrder);
	list.forEach((section, i) => {
		const move = (to: number) => {
			s.sectionOrder = moveSection(s.sectionOrder, section.id, list[to].id, to > i);
			ctx.saveAndRedraw();
		};
		new Setting(el)
			.setName(section.name)
			.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0).onClick(() => move(i - 1)))
			.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === list.length - 1).onClick(() => move(i + 1)))
			.addToggle((t) => t
				.setValue(!s.hiddenSections.includes(section.id))
				.onChange((show) => {
					s.hiddenSections = s.hiddenSections.filter((id) => id !== section.id);
					if (!show) s.hiddenSections.push(section.id);
					ctx.save();
				}));
	});

	// Counterparties for "Spending by counterparty", as removable chips.
	const names = ctx.plugin.db.labels.counterparties.map((c) => c.name);
	const setting = new Setting(el)
		.setName('Counterparties on the dashboard')
		.setDesc('Only these show in "Spending by counterparty".')
		.addButton((b) => b.setButtonText('Add').onClick(() => new PickModal(ctx.app, names.filter((n) => !s.shownCounterparties.includes(n)), (name) => {
			s.shownCounterparties.push(name);
			ctx.saveAndRedraw();
		}).open()));
	const chips = setting.descEl.createDiv({ cls: 'afm-chips' });
	if (s.shownCounterparties.length === 0) chips.createSpan({ cls: 'afm-muted', text: 'None picked yet.' });
	for (const name of s.shownCounterparties) {
		const chip = chips.createSpan({ cls: 'afm-tag', text: name });
		chip.toggleClass('afm-missing', !names.includes(name)); // renamed or deleted elsewhere
		const remove = chip.createSpan({ cls: 'afm-tag-remove', attr: { 'aria-label': `Remove ${name}` } });
		setIconSafe(remove, 'x');
		remove.addEventListener('click', () => {
			s.shownCounterparties = s.shownCounterparties.filter((n) => n !== name);
			ctx.saveAndRedraw();
		});
	}
}

// Fuzzy picker for one counterparty name.
class PickModal extends FuzzySuggestModal<string> {
	constructor(app: App, private names: string[], private onPick: (name: string) => void) {
		super(app);
		this.setPlaceholder('Show which counterparty?');
	}

	getItems(): string[] { return [...this.names].sort((a, b) => a.localeCompare(b)); }
	getItemText(name: string): string { return name; }
	onChooseItem(name: string): void { this.onPick(name); }
}
