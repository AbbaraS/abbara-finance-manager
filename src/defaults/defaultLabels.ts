import type { Labels } from '../models/Labels';

// A new database starts with these: the default categories and income sources, nothing else.
export const DEFAULT_LABELS: Labels = {
	categories: [
		// Spending: four containers.
		{ name: 'Essential', kind: 'spending', color: 'yellow', icon: 'house' },
		{ name: 'Transport', kind: 'spending', color: 'blue', icon: 'train-front' },
		{ name: 'Shopping', kind: 'spending', color: 'magenta', icon: 'shopping-bag' },
		{ name: 'Lifestyle', kind: 'spending', color: 'violet', icon: 'sparkles' },
		// People: each person has their own subcategories.
		{ name: 'People', kind: 'people', color: 'aqua', icon: 'user' },
		// Income.
		{ name: 'PhD', kind: 'income', color: 'blue', icon: 'graduation-cap' },
		{ name: 'UMSU', kind: 'income', color: 'violet', icon: 'briefcase' },
		// Not counted.
		{ name: 'Transfer', kind: 'transfer', color: 'gray', icon: 'arrow-left-right' },
		{ name: 'Savings', kind: 'saving', color: 'green', icon: 'piggy-bank' },
		{ name: 'Investment', kind: 'saving', color: 'violet', icon: 'trending-up' },
	],
	// A few subcategories each; anything that cuts across them (Sadaqa, Random...) is a tag.
	subcategories: [
		...['Groceries', 'Bills', 'Utilities'].map((name) => ({ name, parent: 'Essential', person: '' })),
		...['Taxi', 'Bus', 'Train', 'Coach'].map((name) => ({ name, parent: 'Transport', person: '' })),
		...['Clothes & beauty', 'Online & other'].map((name) => ({ name, parent: 'Shopping', person: '' })),
		...['Eating out', 'Entertainment', 'Apps & subscriptions', 'Travel', 'Other'].map((name) => ({ name, parent: 'Lifestyle', person: '' })),
	],
	people: [],
	accounts: [],
	counterparties: [
		{ name: 'University of Manchester', patterns: ['UNIV OF MANCHESTER'], category: 'PhD', subcategory: '', account: '', direction: 'in' },
		{ name: 'Students\' Union', patterns: ['MAN UNI STUDENTS U BGC'], category: 'UMSU', subcategory: '', account: '', direction: 'in' },
	],
	types: [{ name: 'Subscription' }, { name: 'Instalments' }],
	subscriptions: [],
	transactions: {},
	debts: [],
};

// A fresh copy of the defaults.
export function copyDefaultLabels(): Labels {
	return structuredClone(DEFAULT_LABELS);
}
