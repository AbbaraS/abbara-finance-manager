import { debounce, normalizePath, TAbstractFile } from 'obsidian';
import type FinancePlugin from '../main';

// Redraws when the CSVs change (e.g. after `make combine`) or the labels file changes outside the plugin (sync, an editor).
export function watchFiles(plugin: FinancePlugin): void {
	const refresh = debounce(() => { plugin.cache.clear(); plugin.refreshViews(); }, 500, true);
	const inFolder = (file: TAbstractFile, oldPath = '') => {
		const prefix = normalizePath(plugin.settings.dataFolder) + '/';
		return file.path.startsWith(prefix) || oldPath.startsWith(prefix);
	};
	const isLabels = (file: TAbstractFile) => file.path === normalizePath(plugin.settings.labelsFile);
	const changed = (file: TAbstractFile, oldPath?: string) => {
		if (isLabels(file)) void plugin.reloadLabels();
		else if (inFolder(file, oldPath)) refresh();
	};

	const vault = plugin.app.vault;
	plugin.registerEvent(vault.on('create', (f) => changed(f)));
	plugin.registerEvent(vault.on('modify', (f) => changed(f)));
	plugin.registerEvent(vault.on('delete', (f) => changed(f)));
	plugin.registerEvent(vault.on('rename', (f, old) => changed(f, old)));
}
