import type { FinanceSettings } from './FinanceSettings';
import type { Account } from './Labels';
import { learnCounterparts, moveSignature } from './learnCounterparts';
import { pairTransfers } from './pairTransfers';
import { UNCATEGORISED } from './rowKind';
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

// Pairs the two sides of each transfer and sets foundAccount on transfers.
// The other account comes from: set by hand > an account's match text > the matching row in the other account
// > what similar rows usually pair with. An uncategorised row that is the other side of a transfer
// becomes a transfer too, so it isn't counted as spending or listed twice.
export function linkTransfers(rows: Transaction[], accounts: Account[]): Transaction[] {
	const moves = rows.filter((t) => t.kind === 'transfer');
	const candidates = rows.filter((t) => t.kind === 'transfer' || t.kind === null);
	const matchOf = (t: Transaction) => {
		const text = t.description.toLowerCase();
		return accounts.find((a) => a.match.trim() && a.name !== t.account && text.includes(a.match.trim().toLowerCase()))?.name ?? '';
	};
	const known = (t: Transaction) => t.otherAccount || matchOf(t);

	// Pair once, learn each description's usual other account, then pair again with that as a hint.
	const learned = learnCounterparts(moves, pairTransfers(moves, candidates, known));
	const hint = (t: Transaction) => known(t) || (t.kind === 'transfer' ? learned.get(moveSignature(t)) ?? '' : '');
	const pairs = pairTransfers(moves, candidates, hint);

	// New rows, then point partners at the new rows.
	const out = rows.map((t): Transaction => {
		const p = pairs.get(t.id);
		const adopt = t.category === UNCATEGORISED && p?.kind === 'transfer'; // uncategorised other side
		const isMove = t.kind === 'transfer' || adopt;
		return {
			...t,
			...(adopt ? { category: p.category, kind: p.kind, subcategory: p.subcategory, source: 'pair' as const } : {}),
			foundAccount: isMove ? t.otherAccount || p?.account || hint(t) || UNKNOWN_ACCOUNT : '',
			partner: null,
		};
	});
	const byId = new Map(out.map((t) => [t.id, t]));
	for (const t of out) t.partner = byId.get(pairs.get(t.id)?.id ?? '') ?? null;
	return out;
}

// Groups transfers into account-to-account flows. A pair is counted once, from the money-out side.
export function transferFlows(rows: Transaction[], s: FinanceSettings): Flow[] {
	const flows = new Map<string, Flow>();
	for (const t of rows) {
		if (t.kind !== 'transfer' || t.currency !== s.currency) continue;
		if (t.amount > 0 && t.partner?.kind === 'transfer' && t.partner.foundAccount === t.account) continue; // counted from the out side
		const [from, to] = t.amount < 0 ? [t.account, t.foundAccount] : [t.foundAccount, t.account];
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
