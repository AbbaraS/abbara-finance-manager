import { Plugin } from 'obsidian';
import { TransactionCache } from './data/TransactionCache';
import { watchDataFolder } from './data/watchDataFolder';
import { copyDefaultSettings } from './defaults/defaultSettings';
import type { FinanceSettings } from './models/FinanceSettings';
import { migrateSettings } from './models/migrateSettings';
import { FinanceSettingTab } from './settings/SettingsTab';
import { DashboardView, VIEW_TYPE } from './views/DashboardView';

// Entry point: loads settings and wires the dashboard, command and settings tab.
export default class FinancePlugin extends Plugin {
	settings!: FinanceSettings;
	cache!: TransactionCache;

	async onload() {
		await this.loadSettings();
		this.cache = new TransactionCache(this.app);
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

	// Redraws every open dashboard (files are only re-read after cache.clear()).
	refreshViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			if (leaf.view instanceof DashboardView) void leaf.view.reload();
		}
	}

	async loadSettings() {
		const saved = await this.loadData();
		// Saved data without a version is from v1.
		this.settings = saved ? { ...copyDefaultSettings(), version: 1, ...saved } : copyDefaultSettings();
		migrateSettings(this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshViews();
	}
}
