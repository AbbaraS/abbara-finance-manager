import type { App } from 'obsidian';
import type FinancePlugin from '../main';

// Shared by every settings section.
export interface SettingsContext {
	app: App;
	plugin: FinancePlugin;
	save: () => void; // debounced, for typing
}
