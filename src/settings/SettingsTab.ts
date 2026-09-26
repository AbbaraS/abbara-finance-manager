import { App, debounce, PluginSettingTab } from 'obsidian';
import type FinancePlugin from '../main';
import type { SettingsContext } from './context';
import { categoriesSection } from './sections/categoriesSection';
import { dataSection } from './sections/dataSection';

// Settings tab shell: builds the shared context and lays out the sections.
export class FinanceSettingTab extends PluginSettingTab {
	private ctx: SettingsContext;

	constructor(app: App, plugin: FinancePlugin) {
		super(app, plugin);
		const save = debounce(() => void plugin.saveSettings(), 600, true);
		this.ctx = { app, plugin, save };
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		dataSection(containerEl, this.ctx);
		categoriesSection(containerEl, this.ctx);
	}
}
