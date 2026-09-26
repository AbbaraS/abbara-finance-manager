import { debounce, normalizePath, TAbstractFile } from 'obsidian';
import type FinancePlugin from '../main';

// Re-reads and redraws when files in the data folder change (e.g. after `make combine`).
export function watchDataFolder(plugin: FinancePlugin): void {
	const refresh = debounce(() => { plugin.cache.clear(); plugin.refreshViews(); }, 500, true);
	const inFolder = (file: TAbstractFile, oldPath = '') => {
		const prefix = normalizePath(plugin.settings.dataFolder) + '/';
		return file.path.startsWith(prefix) || oldPath.startsWith(prefix);
	};
	const vault = plugin.app.vault;
	plugin.registerEvent(vault.on('create', (f) => inFolder(f) && refresh()));
	plugin.registerEvent(vault.on('modify', (f) => inFolder(f) && refresh()));
	plugin.registerEvent(vault.on('delete', (f) => inFolder(f) && refresh()));
	plugin.registerEvent(vault.on('rename', (f, old) => inFolder(f, old) && refresh()));
}
