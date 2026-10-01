import type { Labels } from '../models/Labels';

// A new database starts with these: the default categories and income sources, nothing else.
export const DEFAULT_LABELS: Labels = {
	categories: [
		// Spending.
		{ name: 'Transport', kind: 'spending', color: 'blue', icon: 'train-front' },
		{ name: 'Food', kind: 'spending', color: 'green', icon: 'utensils' },
		{ name: 'Shopping', kind: 'spending', color: 'magenta', icon: 'shopping-bag' },
		{ name: 'Bills', kind: 'spending', color: 'yellow', icon: 'receipt' },
		{ name: 'Subscriptions', kind: 'spending', color: 'violet', icon: 'repeat' },
		{ name: 'Family', kind: 'spending', color: 'orange', icon: 'users' },
		{ name: 'General Spending', kind: 'spending', color: 'gray', icon: 'circle-dashed' },
		// People: the subcategory is the person.
		{ name: 'People', kind: 'people', color: 'aqua', icon: 'user' },
		// Income.
		{ name: 'PhD', kind: 'income', color: 'blue', icon: 'graduation-cap' },
		{ name: 'UMSU', kind: 'income', color: 'violet', icon: 'briefcase' },
		// Not counted.
		{ name: 'Transfer', kind: 'transfer', color: 'gray', icon: 'arrow-left-right' },
		{ name: 'Savings', kind: 'saving', color: 'green', icon: 'piggy-bank' },
		{ name: 'Investment', kind: 'saving', color: 'violet', icon: 'trending-up' },
	],
	subcategories: [],
	people: [],
	accounts: [],
	rules: [
		{ patterns: ['UNIV OF MANCHESTER'], category: 'PhD', subcategory: '', account: '', direction: 'in' },
		{ patterns: ['MAN UNI STUDENTS U BGC'], category: 'UMSU', subcategory: '', account: '', direction: 'in' },
	],
	types: [{ name: 'Subscription' }, { name: 'Instalments' }],
	subscriptions: [],
	transactions: {},
};

// A fresh copy of the defaults.
export function copyDefaultLabels(): Labels {
	return structuredClone(DEFAULT_LABELS);
}
