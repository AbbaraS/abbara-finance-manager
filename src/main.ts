import { Plugin } from 'obsidian';
import { Database } from './data/Database';
import { copyDefaultSettings } from './defaults/defaultSettings';
import type { FinanceSettings } from './models/FinanceSettings';
import { FinanceSettingTab } from './settings/SettingsTab';
import { DashboardView, VIEW_TYPE } from './views/DashboardView';

// Entry point: loads settings and the database, and wires the dashboard, command and settings tab.
export default class FinancePlugin extends Plugin {
	settings!: FinanceSettings;
	db!: Database;

	async onload() {
		// Settings: known fields only, so fields from older versions are dropped on the next save.
		const saved: Record<string, unknown> = (await this.loadData()) ?? {};
		this.settings = copyDefaultSettings();
		for (const key of Object.keys(this.settings)) if (saved[key] !== undefined) Object.assign(this.settings, { [key]: saved[key] });

		this.db = new Database(this.app, () => this.settings.dbFile);
		this.register(() => this.db.close());
		await this.openDatabase();
		this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
		this.addRibbonIcon('wallet', 'Open finance dashboard', () => this.openDashboard());
		this.addCommand({ id: 'open-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
		this.addSettingTab(new FinanceSettingTab(this.app, this));
	}

	// Shows the dashboard, reusing an open one.
	async openDashboard() {
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		workspace.revealLeaf(leaf);
	}

	// Reads the database file from settings and watches it for outside changes (e.g. `make` in myFinances).
	async openDatabase() {
		await this.db.load();
		this.db.watch(() => this.refreshViews());
		this.refreshViews();
	}

	// Redraws every open dashboard.
	refreshViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			if (leaf.view instanceof DashboardView) leaf.view.render();
		}
	}

	// Saves settings and the database, then redraws.
	async save() {
		await Promise.all([this.saveData(this.settings), this.db.save()]);
		this.refreshViews();
	}

	// Saves settings only (not the database), then redraws.
	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshViews();
	}
}
