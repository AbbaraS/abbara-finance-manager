import type { FinanceSettings } from '../models/FinanceSettings';

// Current settings version (see migrateSettings).
export const SETTINGS_VERSION = 2;

// First-run settings; copied before use so edits never touch this object.
export const DEFAULT_SETTINGS: FinanceSettings = {
	version: SETTINGS_VERSION,
	dataFolder: 'Finance/combined',
	currency: 'GBP',
	locale: 'en-GB',
	incomeAccounts: ['barclays - debit'],
	categories: [
		// Spending.
		{ name: 'Bills', kind: 'spending', color: 'yellow', icon: 'receipt' },
		{ name: 'Eating out', kind: 'spending', color: 'orange', icon: 'utensils' },
		{ name: 'Fees & interest', kind: 'spending', color: 'red', icon: 'percent' },
		{ name: 'Groceries', kind: 'spending', color: 'green', icon: 'shopping-basket' },
		{ name: 'Health', kind: 'spending', color: 'magenta', icon: 'heart-pulse' },
		{ name: 'Insurance', kind: 'spending', color: 'violet', icon: 'shield' },
		{ name: 'Phone', kind: 'spending', color: 'aqua', icon: 'smartphone' },
		{ name: 'Refund', kind: 'spending', color: 'aqua', icon: 'undo-2' },
		{ name: 'Shopping', kind: 'spending', color: 'magenta', icon: 'shopping-bag' },
		{ name: 'Subscriptions', kind: 'spending', color: 'violet', icon: 'repeat' },
		{ name: 'Tax', kind: 'spending', color: 'red', icon: 'landmark' },
		{ name: 'Transport', kind: 'spending', color: 'blue', icon: 'train-front' },
		{ name: 'Travel', kind: 'spending', color: 'aqua', icon: 'plane' },
		{ name: 'Other', kind: 'spending', color: 'gray', icon: 'circle-dashed' },
		// Income.
		{ name: 'Income', kind: 'income', color: 'blue', icon: 'banknote' },
		// Investment.
		{ name: 'Investment', kind: 'investment', color: 'violet', icon: 'trending-up' },
		// Transfers between my accounts.
		{ name: 'Savings', kind: 'transfer', color: 'green', icon: 'piggy-bank' },
		{ name: 'Transfer', kind: 'transfer', color: 'gray', icon: 'arrow-left-right' },
		// Not counted.
		{ name: 'Family support', kind: 'excluded', color: 'magenta', icon: 'users' },
	],
	rules: [],
	edits: {},
	details: {},
	hiddenSections: [],
};

// A fresh copy of the defaults.
export function copyDefaultSettings(): FinanceSettings {
	return structuredClone(DEFAULT_SETTINGS);
}
