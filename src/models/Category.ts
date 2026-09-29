// How a category counts in the totals.
export type CategoryKind = 'spending' | 'income' | 'investment' | 'transfer' | 'excluded';

// One category you can pick.
export interface Category {
	name: string;
	kind: CategoryKind;
	color: string; // colour name from COLOR_NAMES, or "#rrggbb"
	icon: string;  // Lucide icon id, '' = the kind's icon
}

// Labels for the "Counts as" dropdown.
export const KIND_LABELS: Record<CategoryKind, string> = {
	spending: 'Spending (money in = refund)',
	income: 'Income',
	investment: 'Investment',
	transfer: 'Transfer between my accounts',
	excluded: 'Not counted',
};

// Icon used when a category has none.
export const KIND_ICONS: Record<CategoryKind, string> = {
	spending: 'tag',
	income: 'banknote',
	investment: 'trending-up',
	transfer: 'arrow-left-right',
	excluded: 'circle-slash',
};
