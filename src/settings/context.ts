import type { App } from 'obsidian';
import type FinancePlugin from '../main';
import type { Transaction } from '../models/Transaction';

// Shared by every settings section.
export interface SettingsContext {
	app: App;
	plugin: FinancePlugin;
	save: () => void;           // debounced, for typing
	saveAndRedraw: () => void;  // for changes that add, remove or move items
	redraw: () => void;         // rebuilds the tab without saving
	open: Set<string>;          // open collapsible boxes, kept across redraws
	rows: Transaction[];        // categorised rows, for counts
	accounts: string[];         // accounts in the data + ones you added
}
