// Dashboard sections you can hide in settings, in page order.
export const SECTIONS = [
	{ id: 'summary', name: 'Summary cards' },
	{ id: 'monthly', name: 'Monthly overview' },
	{ id: 'daily', name: 'Running net' },
	{ id: 'moneyIn', name: 'Money in' },
	{ id: 'category', name: 'Spending by category' },
	{ id: 'subscriptions', name: 'Subscriptions' },
	{ id: 'account', name: 'Spending by account' },
	{ id: 'transfers', name: 'Transfers between accounts' },
	{ id: 'comparison', name: 'Compared with last month' },
	{ id: 'uncategorised', name: 'Uncategorised' },
] as const;

export type SectionId = typeof SECTIONS[number]['id'];
