import { Plugin } from 'obsidian';
import { LabelStore } from './data/LabelStore';
import { TransactionCache } from './data/TransactionCache';
import { watchFiles } from './data/watchFiles';
import { copyDefaultSettings } from './defaults/defaultSettings';
import type { FinanceSettings } from './models/FinanceSettings';
import { FinanceSettingTab } from './settings/SettingsTab';
import { DashboardView, VIEW_TYPE } from './views/DashboardView';

// Entry point: loads settings and labels, and wires the dashboard, command and settings tab.
export default class FinancePlugin extends Plugin {
	settings!: FinanceSettings;
	labels!: LabelStore;
	cache!: TransactionCache;

	async onload() {
		// Settings: known fields only, so fields from older versions are dropped on the next save.
		const saved: Record<string, unknown> = (await this.loadData()) ?? {};
		this.settings = copyDefaultSettings();
		for (const key of Object.keys(this.settings)) if (saved[key] !== undefined) Object.assign(this.settings, { [key]: saved[key] });

		this.labels = new LabelStore(this.app, () => this.settings.labelsFile);
		await this.labels.load();
		this.cache = new TransactionCache(this.app);
		this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
		this.addRibbonIcon('wallet', 'Open finance dashboard', () => this.openDashboard());
		this.addCommand({ id: 'open-dashboard', name: 'Open dashboard', callback: () => this.openDashboard() });
		this.addSettingTab(new FinanceSettingTab(this.app, this));
		watchFiles(this);
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

	// Re-reads the labels file; redraws when it changed.
	async reloadLabels() {
		if (await this.labels.load()) this.refreshViews();
	}

	// Saves settings and labels, then redraws.
	async save() {
		await Promise.all([this.saveData(this.settings), this.labels.save()]);
		this.refreshViews();
	}
}
