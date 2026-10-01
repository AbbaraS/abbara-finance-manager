// How a category counts in the totals.
export type CategoryKind = 'spending' | 'people' | 'income' | 'transfer' | 'saving';

// One category. The list lives in the database; defaults are in defaults/defaultLabels.ts.
export interface Category {
	id?: number;   // database id, empty until first saved
	name: string;
	kind: CategoryKind;
	color: string; // colour name from COLOR_NAMES, or "#rrggbb"
	icon: string;  // Lucide icon id
}

// Kind names, in list order.
export const KIND_LABELS: Record<CategoryKind, string> = {
	spending: 'Spending',
	people: 'People',
	income: 'Income',
	transfer: 'Transfers',
	saving: 'Savings & investments',
};

// Icon for a new category of each kind.
export const KIND_ICONS: Record<CategoryKind, string> = {
	spending: 'tag',
	people: 'user',
	income: 'banknote',
	transfer: 'arrow-left-right',
	saving: 'piggy-bank',
};
