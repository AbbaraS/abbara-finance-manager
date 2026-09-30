// How a category counts in the totals.
export type CategoryKind = 'spending' | 'income' | 'transfer' | 'investment';

// One fixed category (listed in defaults/categories.ts).
export interface Category {
	name: string;
	kind: CategoryKind;
	color: string; // colour name from COLOR_NAMES, or "#rrggbb"
	icon: string;  // Lucide icon id
}

// Heading each kind is listed under.
export const KIND_GROUP: Record<CategoryKind, string> = {
	spending: 'Spending',
	income: 'Income',
	transfer: 'Not counted',
	investment: 'Not counted',
};
