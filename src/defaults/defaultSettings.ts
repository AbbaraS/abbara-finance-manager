import type { FinanceSettings } from '../models/FinanceSettings';

// First-run settings; copied before use so edits never touch this object.
export const DEFAULT_SETTINGS: FinanceSettings = {
	dataFolder: 'Finance/combined',
	currency: 'GBP',
	locale: 'en-GB',
	incomeAccounts: ['barclays - debit'],
	categories: [
		// Spending.
		{ name: 'Bills', kind: 'spending' },
		{ name: 'Eating out', kind: 'spending' },
		{ name: 'Fees & interest', kind: 'spending' },
		{ name: 'Groceries', kind: 'spending' },
		{ name: 'Health', kind: 'spending' },
		{ name: 'Insurance', kind: 'spending' },
		{ name: 'Phone', kind: 'spending' },
		{ name: 'Refund', kind: 'spending' },
		{ name: 'Shopping', kind: 'spending' },
		{ name: 'Subscriptions', kind: 'spending' },
		{ name: 'Tax', kind: 'spending' },
		{ name: 'Transport', kind: 'spending' },
		{ name: 'Travel', kind: 'spending' },
		{ name: 'Other', kind: 'spending' },
		// Income.
		{ name: 'Income', kind: 'income' },
		// Not counted.
		{ name: 'Family support', kind: 'excluded' },
		{ name: 'Investment', kind: 'excluded' },
		{ name: 'Savings', kind: 'excluded' },
		{ name: 'Transfer', kind: 'excluded' },
	],
	rules: [],
	edits: {},
	hiddenSections: [],
};

// A fresh copy of the defaults.
export function copyDefaultSettings(): FinanceSettings {
	return structuredClone(DEFAULT_SETTINGS);
}
