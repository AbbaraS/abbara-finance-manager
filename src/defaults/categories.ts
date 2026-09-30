import type { Category } from '../models/Category';

// The fixed categories, in list order. Subcategories are free text under these.
// Renaming one means old labels need moving too (see models/migrateToLabels.ts).
export const CATEGORIES: readonly Category[] = [
	// Spending.
	{ name: 'Transport', kind: 'spending', color: 'blue', icon: 'train-front' },
	{ name: 'Food', kind: 'spending', color: 'green', icon: 'utensils' },
	{ name: 'Shopping', kind: 'spending', color: 'magenta', icon: 'shopping-bag' },
	{ name: 'Bills', kind: 'spending', color: 'yellow', icon: 'receipt' },
	{ name: 'Subscriptions', kind: 'spending', color: 'violet', icon: 'repeat' },
	{ name: 'Family', kind: 'spending', color: 'orange', icon: 'users' },
	{ name: 'General Spending', kind: 'spending', color: 'gray', icon: 'circle-dashed' },
	// Income.
	{ name: 'PhD', kind: 'income', color: 'blue', icon: 'graduation-cap' },
	{ name: 'GTA', kind: 'income', color: 'aqua', icon: 'presentation' },
	{ name: 'UMSU', kind: 'income', color: 'violet', icon: 'briefcase' },
	// Not counted.
	{ name: 'Other', kind: 'income', color: 'gray', icon: 'banknote' },
	{ name: 'Transfer', kind: 'transfer', color: 'gray', icon: 'arrow-left-right' },
	{ name: 'Investment', kind: 'investment', color: 'violet', icon: 'trending-up' },
];
