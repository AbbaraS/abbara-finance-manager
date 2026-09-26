import { App, debounce, PluginSettingTab } from 'obsidian';
import type FinancePlugin from '../main';
import { accountNames } from '../models/accountNames';
import { categorise } from '../models/categorise';
import type { SettingsContext } from './context';
import { categoriesSection } from './sections/categoriesSection';
import { dataSection } from './sections/dataSection';
import { editsSection } from './sections/editsSection';
import { incomeSection } from './sections/incomeSection';
import { rulesSection } from './sections/rulesSection';
import { sectionsSection } from './sections/sectionsSection';

// Settings tab shell: loads the rows for counts, then lays out the sections.
export class FinanceSettingTab extends PluginSettingTab {
	private save: () => void;

	constructor(app: App, private plugin: FinancePlugin) {
		super(app, plugin);
		this.save = debounce(() => void plugin.saveSettings(), 600, true);
	}

	display(): void {
		void this.draw();
	}

	// Rebuilds every section, keeping the scroll position.
	private async draw() {
		const { containerEl: el, plugin } = this;
		const raw = await plugin.cache.get(plugin.settings.dataFolder);
		const ctx: SettingsContext = {
			app: this.app, plugin, save: this.save,
			saveAndRedraw: () => { void plugin.saveSettings(); this.display(); },
			rows: categorise(raw, plugin.settings),
			accounts: accountNames(raw),
		};

		const scroll = el.scrollTop;
		el.empty();
		dataSection(el, ctx);
		sectionsSection(el, ctx);
		incomeSection(el, ctx);
		categoriesSection(el, ctx);
		rulesSection(el, ctx);
		editsSection(el, ctx);
		el.scrollTop = scroll;
	}
}
