import type { FinanceSettings } from '../../models/FinanceSettings';
import { spendOf } from '../../models/rowKind';
import type { Transaction } from '../../models/Transaction';
import { formatMoney } from '../../utils/money';

// "Gold £200 · Stocks £500": spending per subcategory, or '' when none have one.
export function subTotals(rows: Transaction[], s: FinanceSettings): string {
	const subs = new Map<string, number>();
	for (const t of rows) if (t.subcategory) subs.set(t.subcategory, (subs.get(t.subcategory) ?? 0) + spendOf(t, s));
	return [...subs].sort((a, b) => b[1] - a[1]).map(([name, total]) => `${name} ${formatMoney(total, s)}`).join(' · ');
}
