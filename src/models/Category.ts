// spending: money out is spent, money in is a refund. income: money in is income. excluded: left out of totals.
export type CategoryKind = 'spending' | 'income' | 'excluded';

// One category you can pick.
export interface Category {
	name: string;
	kind: CategoryKind;
}

// Labels for the "Counts as" dropdown.
export const KIND_LABELS: Record<CategoryKind, string> = {
	spending: 'Spending (money in = refund)',
	income: 'Income',
	excluded: 'Not counted',
};
