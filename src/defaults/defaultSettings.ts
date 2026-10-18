import type { FinanceSettings } from '../models/FinanceSettings';

// First-run settings; copied before use so edits never touch this object.
export const DEFAULT_SETTINGS: FinanceSettings = {
	dbFile: '',
	currency: 'GBP',
	locale: 'en-GB',
	hiddenSections: [],
	sectionOrder: [],
	collapsedSections: [],
	halfSections: ['monthly', 'daily', 'people', 'debts', 'moneyIn', 'top'],
	sectionColumns: { monthly: 'left', daily: 'right', people: 'left', debts: 'right', moneyIn: 'left', top: 'right' },
	describedRecipients: ['Apple.com'],
	subscriptionsOverall: false,
};

// A fresh copy of the defaults.
export function copyDefaultSettings(): FinanceSettings {
	return structuredClone(DEFAULT_SETTINGS);
}
