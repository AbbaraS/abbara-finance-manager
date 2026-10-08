import { Plugin } from 'obsidian';
import { Database } from './data/Database';
import { DevDatabase } from './data/DevDatabase';
import { copyDefaultSettings } from './defaults/defaultSettings';
import type { FinanceSettings } from './models/FinanceSettings';
import { FinanceSettingTab } from './settings/SettingsTab';
import { DashboardView, DEV_VIEW_TYPE, VIEW_TYPE } from './views/DashboardView';

// Entry point: loads settings and the database, and wires the dashboard, command and settings tab.
export default class FinancePlugin extends Plugin {
	settings!: FinanceSettings;
	db!: Database;
	devDb!: DevDatabase; // the new structure from `make dev`, read only

	async onload() {
		// Settings: known fields only, so fields from older versions are dropped on the next save.
		const saved: Record<string, unknown> = (await this.loadData()) ?? {};
		this.settings = copyDefaultSettings();
		for (const key of Object.keys(this.settings)) if (saved[key] !== undefined) Object.assign(this.settings, { [key]: saved[key] });

		this.db = new Database(this.app, () => this.settings.dbFile);
		this.devDb = new DevDatabase(this.app, () => this.settings.devDbFile);
		this.register(() => { this.db.close(); this.devDb.close(); });
		await this.openDatabase();
		if (this.settings.devDbFile) await this.openDevDatabase();
		this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
		this.registerView(DEV_VIEW_TYPE, (leaf) => new DashboardView(leaf, this, true));
		this.addRibbonIcon('wallet', 'Open finance dashboard', () => this.openDashboard());
		this.addCommand({ id: 'open-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
		this.addCommand({ id: 'open-dev-dashboard', name: 'Open dev dashboard (make dev)', callback: () => this.openDashboard(DEV_VIEW_TYPE) });
		this.addSettingTab(new FinanceSettingTab(this.app, this));
	}

	// Shows a dashboard (the normal one or the dev one), reusing an open one.
	async openDashboard(type = VIEW_TYPE) {
		const { workspace } = this.app;
		if (type === DEV_VIEW_TYPE && !this.devDb.rows.length) await this.openDevDatabase();
		const leaf = workspace.getLeavesOfType(type)[0] ?? workspace.getLeaf('tab');
		await leaf.setViewState({ type, active: true });
		workspace.revealLeaf(leaf);
	}

	// Reads the database file from settings and watches it for outside changes (e.g. `make` in myFinances).
	async openDatabase() {
		await this.db.load();
		this.db.watch(() => this.refreshViews());
		this.refreshViews();
	}

	// Reads the dev database and reloads it after each `make dev`.
	async openDevDatabase() {
		await this.devDb.load();
		this.devDb.watch(() => this.refreshViews());
		this.refreshViews();
	}

	// Redraws every open dashboard.
	refreshViews() {
		for (const leaf of [...this.app.workspace.getLeavesOfType(VIEW_TYPE), ...this.app.workspace.getLeavesOfType(DEV_VIEW_TYPE)]) {
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
