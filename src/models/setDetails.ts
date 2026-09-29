import type { FinanceSettings } from './FinanceSettings';
import type { TransactionDetails } from './TransactionDetails';

// Merges details for one transaction; empty values are removed, and so is an empty entry.
export function setDetails(s: FinanceSettings, key: string, patch: TransactionDetails): void {
	const d: TransactionDetails = { ...s.details[key], ...patch };
	for (const k of Object.keys(d) as (keyof TransactionDetails)[]) if (!d[k]?.trim()) delete d[k];
	if (Object.keys(d).length === 0) delete s.details[key];
	else s.details[key] = d;
}
