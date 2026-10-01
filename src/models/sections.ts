// Dashboard sections in their default page order. You can hide, reorder and collapse them.
export const SECTIONS = [
	{ id: 'summary', name: 'Summary', icon: 'layout-dashboard' },
	{ id: 'monthly', name: 'Monthly overview', icon: 'chart-column' },
	{ id: 'daily', name: 'Running net through the month', icon: 'activity' },
	{ id: 'moneyIn', name: 'Income', icon: 'hand-coins' },
	{ id: 'category', name: 'Spending by category', icon: 'shopping-cart' },
	{ id: 'people', name: 'People', icon: 'users' },
	{ id: 'counterparty', name: 'Spending by counterparty', icon: 'store' },
	{ id: 'tags', name: 'Spending by tag', icon: 'hash' },
	{ id: 'subscriptions', name: 'Subscriptions', icon: 'repeat' },
	{ id: 'account', name: 'Spending by account', icon: 'landmark' },
	{ id: 'transfers', name: 'Transfers between accounts', icon: 'arrow-left-right' },
	{ id: 'comparison', name: 'Compared with last month', icon: 'git-compare-arrows' },
	{ id: 'uncategorised', name: 'Uncategorised', icon: 'circle-help' },
] as const;

export type Section = typeof SECTIONS[number];
export type SectionId = Section['id'];

// Sections in your saved order; ones missing from it (e.g. new sections) keep their default place.
export function orderedSections(order: string[]): Section[] {
	const out = order.map((id) => SECTIONS.find((x) => x.id === id)).filter((x): x is Section => !!x);
	SECTIONS.forEach((x, i) => {
		if (out.includes(x)) return;
		const before = SECTIONS.slice(0, i).reverse().find((y) => out.includes(y)); // after its default neighbour
		out.splice(before ? out.indexOf(before) + 1 : 0, 0, x);
	});
	return out;
}

// The order after moving section `id` before or after `target`.
export function moveSection(order: string[], id: string, target: string, after: boolean): string[] {
	const ids = orderedSections(order).map((x) => x.id as string).filter((x) => x !== id);
	ids.splice(ids.indexOf(target) + (after ? 1 : 0), 0, id);
	return ids;
}
