import { App, debounce, PluginSettingTab } from 'obsidian';
import type FinancePlugin from '../main';
import { accountNames } from '../models/accountNames';
import { categorise } from '../models/categorise';
import type { SettingsContext } from './context';
import { accountsSection } from './sections/accountsSection';
import { categoriesSection } from './sections/categoriesSection';
import { dataSection } from './sections/dataSection';
import { editsSection } from './sections/editsSection';
import { merchantsSection } from './sections/merchantsSection';
import { sectionsSection } from './sections/sectionsSection';

// Settings tab shell: loads the rows for counts, then lays out the sections.
export class FinanceSettingTab extends PluginSettingTab {
	private save: () => void;

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
			rows: categorise(raw, plugin.db.labels),
			accounts: accountNames(raw, plugin.db.labels.accounts),
		};

		const scroll = el.scrollTop;
		el.empty();
		dataSection(el, ctx);
		sectionsSection(el, ctx);
		categoriesSection(el, ctx);
		accountsSection(el, ctx);
		merchantsSection(el, ctx);
		editsSection(el, ctx);
		el.scrollTop = scroll;
	}
}
