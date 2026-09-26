import { Plugin } from 'obsidian';
import { watchDataFolder } from './data/watchDataFolder';
import { copyDefaultSettings } from './defaults/defaultSettings';
import type { FinanceSettings } from './models/FinanceSettings';
import { FinanceSettingTab } from './settings/SettingsTab';
import { DashboardView, VIEW_TYPE } from './views/DashboardView';

// Entry point: loads settings and wires the dashboard, command and settings tab.
export default class FinancePlugin extends Plugin {
	settings!: FinanceSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
		this.addRibbonIcon('wallet', 'Open finance dashboard', () => this.openDashboard());
		this.addCommand({ id: 'open-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
		this.addSettingTab(new FinanceSettingTab(this.app, this));
		watchDataFolder(this);
	}

	// Shows the dashboard, reusing an open one.
	async openDashboard() {
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		workspace.revealLeaf(leaf);
	}

	// Reloads data in every open dashboard.
	refreshViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			if (leaf.view instanceof DashboardView) void leaf.view.reload();
		}
	}

	async loadSettings() {
		this.settings = { ...copyDefaultSettings(), ...((await this.loadData()) ?? {}) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshViews();
	}
}
