import type { FinanceSettings } from './FinanceSettings';
import { isIncomeAccount } from './rowKind';
import type { Transaction } from './Transaction';

// This month's money in on the income accounts, oldest first.
export function moneyIn(rows: Transaction[], month: string, s: FinanceSettings): Transaction[] {
	return rows.filter((t) => t.month === month && t.amount > 0 && t.currency === s.currency && isIncomeAccount(t, s));
}
