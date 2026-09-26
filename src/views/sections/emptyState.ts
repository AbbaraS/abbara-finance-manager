import type FinancePlugin from '../../main';

// Shown when the data folder has no CSVs.
export function emptyState(el: HTMLElement, plugin: FinancePlugin): void {
	const box = el.createDiv({ cls: 'afm-empty' });
	box.createEl('h2', { text: 'No data found' });
	box.createEl('p', { text: `No CSV files in "${plugin.settings.dataFolder}".` });
	box.createEl('p', { text: 'Symlink myFinances/data/combined into your vault, then set the folder in settings.' });
}
