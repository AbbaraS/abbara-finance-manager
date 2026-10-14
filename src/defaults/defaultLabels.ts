import type { Labels } from '../models/Labels';

// Empty lists, used while the database can't be read. A new database gets its first lists from myFinances' seed.sql.
export const DEFAULT_LABELS: Labels = {
	categories: [],
	subcategories: [],
	people: [],
	accounts: [],
	counterparties: [],
	types: [{ name: 'Subscription' }, { name: 'Instalments' }],
	subscriptions: [],
	transactions: {},
	debts: [],
};

// A fresh copy of the defaults.
export function copyDefaultLabels(): Labels {
	return structuredClone(DEFAULT_LABELS);
}
