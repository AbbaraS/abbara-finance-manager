import type { FinanceSettings } from '../models/FinanceSettings';

// First-run settings; copied before use so edits never touch this object.
export const DEFAULT_SETTINGS: FinanceSettings = {
	dbFile: '',
	devDbFile: '',
	currency: 'GBP',
	locale: 'en-GB',
	hiddenSections: [],
	sectionOrder: [],
	collapsedSections: [],
	shownCounterparties: [],
	hiddenRepeats: [],
};

// A fresh copy of the defaults.
export function copyDefaultSettings(): FinanceSettings {
	return structuredClone(DEFAULT_SETTINGS);
}
