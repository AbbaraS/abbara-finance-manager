import type { FinanceSettings } from './FinanceSettings';
import type { Account } from './Labels';
import { learnCounterparts, moveSignature } from './learnCounterparts';
import { pairTransfers } from './pairTransfers';
import type { Transaction } from './Transaction';

// Shown when the other account can't be found.
export const UNKNOWN_ACCOUNT = 'Unknown account';

// Money moved from one account to another, per month.
export interface Flow {
	from: string;
	to: string;
	months: Map<string, { amount: number; rows: Transaction[] }>;
	total: number;
}

// Groups rows in Transfer-kind categories into account-to-account flows.
// The other account comes from: set by hand > the matching row in the other account > an account whose
// "match" text is in the description > what similar rows usually pair with.
export function transferFlows(rows: Transaction[], s: FinanceSettings, accounts: Account[]): Flow[] {
	const kind = (t: Transaction) => t.kind;
	const inCurrency = rows.filter((t) => t.currency === s.currency);
	const moves = inCurrency.filter((t) => kind(t) === 'transfer');
	const candidates = inCurrency.filter((t) => kind(t) === 'transfer' || kind(t) === null); // other side may be uncategorised
	const pairs = pairTransfers(moves, candidates);
	const learned = learnCounterparts(moves, pairs);

	const flows = new Map<string, Flow>();
	for (const t of moves) {
		const partner = pairs.get(t.id);
		if (t.amount > 0 && partner && kind(partner) === 'transfer') continue; // counted from the out side
		const text = t.description.toLowerCase();
		const matched = accounts.find((a) => a.match.trim() && a.name !== t.account && text.includes(a.match.trim().toLowerCase()))?.name;
		const other = t.otherAccount || partner?.account || matched || learned.get(moveSignature(t)) || UNKNOWN_ACCOUNT;
		const [from, to] = t.amount < 0 ? [t.account, other] : [other, t.account];
		if (from === to) continue;

		const id = `${from}→${to}`;
		const flow = flows.get(id) ?? { from, to, months: new Map(), total: 0 };
		const cell = flow.months.get(t.month) ?? { amount: 0, rows: [] };
		cell.amount += Math.abs(t.amount);
		cell.rows.push(t);
		flow.months.set(t.month, cell);
		flow.total += Math.abs(t.amount);
		flows.set(id, flow);
	}
	return [...flows.values()].sort((a, b) => b.total - a.total);
}
