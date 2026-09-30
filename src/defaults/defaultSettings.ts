import type { FinanceSettings } from '../models/FinanceSettings';

// Current settings version (see migrateOldData).
export const SETTINGS_VERSION = 3;

// First-run settings; copied before use so edits never touch this object.
export const DEFAULT_SETTINGS: FinanceSettings = {
	version: SETTINGS_VERSION,
	dataFolder: 'Finance/combined',
	labelsFile: 'Finance/labels.json',
	currency: 'GBP',
	locale: 'en-GB',
	incomeAccounts: ['barclays - debit'],
	hiddenSections: [],
};

// A fresh copy of the defaults.
export function copyDefaultSettings(): FinanceSettings {
	return structuredClone(DEFAULT_SETTINGS);
}
