import { normalizePath, TAbstractFile } from 'obsidian';
import type FinancePlugin from '../main';

// Re-reads the labels file when it changes outside the plugin (sync, a text editor).
export function watchLabelsFile(plugin: FinancePlugin): void {
	const isLabels = (file: TAbstractFile) => file.path === normalizePath(plugin.settings.labelsFile);
	const reload = (file: TAbstractFile) => { if (isLabels(file)) void plugin.reloadLabels(); };
	const vault = plugin.app.vault;
	plugin.registerEvent(vault.on('create', reload));
	plugin.registerEvent(vault.on('modify', reload));
	plugin.registerEvent(vault.on('delete', reload));
}
