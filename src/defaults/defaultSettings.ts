import type { FinanceSettings } from '../models/FinanceSettings';

// First-run settings; copied before use so edits never touch this object.
export const DEFAULT_SETTINGS: FinanceSettings = {
	dataFolder: 'Finance/combined',
	labelsFile: 'Finance/labels.json',
	currency: 'GBP',
	locale: 'en-GB',
	hiddenSections: [],
};

// A fresh copy of the defaults.
export function copyDefaultSettings(): FinanceSettings {
	return structuredClone(DEFAULT_SETTINGS);
}
