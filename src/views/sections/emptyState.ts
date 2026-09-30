import type FinancePlugin from '../../main';

// Shown when the data folder has no monthly CSVs.
export function emptyState(el: HTMLElement, plugin: FinancePlugin): void {
	const box = el.createDiv({ cls: 'afm-empty' });
	box.createEl('h2', { text: 'No data found' });
	box.createEl('p', { text: `No monthly CSVs (like 2026-01.csv) with an id column in "${plugin.settings.dataFolder}".` });
	box.createEl('p', { text: 'Run make in myFinances, symlink its data/combined into your vault, then set the folder in settings.' });
}
