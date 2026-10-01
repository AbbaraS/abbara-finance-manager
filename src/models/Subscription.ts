// How often a subscription is paid.
export type Period = 'week' | 'month' | 'quarter' | 'year';

// Where a subscription stands: '' active, 'cancel' = remember to cancel it, 'cancelled'.
export type SubscriptionStatus = '' | 'cancel' | 'cancelled';

// A kind of regular payment: Subscription, Instalments...
export interface SubscriptionType {
	id?: number; // database id, empty until first saved
	name: string;
}

// A named regular payment: a counterparty's payments at a price (e.g. "iCloud+": Apple, £2.99 a month).
// Match text is only needed to tell apart two plans of one counterparty at the same price, or when there's no counterparty.
export interface Subscription {
	id?: number;             // database id, empty until first saved
	name: string;
	type: string;            // type name, '' = none
	counterparty: string;    // counterparty whose payments these are, '' = found by match text only
	match: string;           // extra text in the description, any case; '' = any
	amount: number | null;   // cost of one payment; null = any amount
	period: Period;
	payments: number | null; // how many in total ("out of 10"); null = ongoing
	paidBefore: number;      // payments made before your statements start
	status: SubscriptionStatus;
	tags?: string[];         // added to each of its payments
}

// Label value for "not a subscription payment": never matched automatically.
export const NO_SUBSCRIPTION = '-';

// Names for the period dropdown.
export const PERIOD_LABELS: Record<Period, string> = { week: 'Weekly', month: 'Monthly', quarter: 'Every 3 months', year: 'Yearly' };

// Average days between payments.
export const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30.44, quarter: 91.31, year: 365.25 };

// Badge text for each status.
export const STATUS_LABELS: Record<SubscriptionStatus, string> = { '': 'Active', cancel: 'Cancel!', cancelled: 'Cancelled' };
