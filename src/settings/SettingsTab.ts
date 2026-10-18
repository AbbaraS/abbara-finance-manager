import { App, debounce, PluginSettingTab } from 'obsidian';
import type FinancePlugin from '../main';
import { accountNames } from '../models/accountNames';
import { foldable } from './collapsible';
import type { SettingsContext } from './context';
import { accountsSection } from './sections/accountsSection';
import { categoriesSection } from './sections/categoriesSection';
import { counterpartiesSection } from './sections/counterpartiesSection';
import { dataSection } from './sections/dataSection';
import { editsSection } from './sections/editsSection';
import { peopleSection } from './sections/peopleSection';
import { sectionsSection } from './sections/sectionsSection';
import { subscriptionsSection } from './sections/subscriptionsSection';

// Settings tab shell: loads the rows for counts, then lays out the sections.
export class FinanceSettingTab extends PluginSettingTab {
	private save: () => void;
	private open = new Set<string>(); // open collapsible boxes

	constructor(app: App, private plugin: FinancePlugin) {
		super(app, plugin);
		this.save = debounce(() => void plugin.save(), 600, true);
	}

	display(): void {
		void this.draw();
	}

	// Rebuilds every section, keeping the scroll position.
	private async draw() {
		const { containerEl: el, plugin } = this;
		const raw = plugin.db.rows;
		const ctx: SettingsContext = {
			app: this.app, plugin, save: this.save,
			saveAndRedraw: () => { void plugin.save(); this.display(); },
			redraw: () => this.display(),
			open: this.open,
			rows: raw,
			accounts: accountNames(raw, plugin.db.labels.accounts),
		};

		const scroll = el.scrollTop;
		el.empty();
		// Each block folds under its heading.
		foldable(el, ctx, 'block:data', dataSection);
		foldable(el, ctx, 'block:sections', sectionsSection);
		foldable(el, ctx, 'block:categories', categoriesSection);
		foldable(el, ctx, 'block:people', peopleSection);
		foldable(el, ctx, 'block:subscriptions', subscriptionsSection);
		foldable(el, ctx, 'block:accounts', accountsSection);
		foldable(el, ctx, 'block:recipients', counterpartiesSection);
		foldable(el, ctx, 'block:edits', editsSection);
		el.scrollTop = scroll;
	}
}
