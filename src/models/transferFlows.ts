import type { FinanceSettings } from './FinanceSettings';
import type { Account } from './Labels';
import { learnCounterparts, moveSignature } from './learnCounterparts';
import { pairTransfers } from './pairTransfers';
import { UNCATEGORISED } from './rowKind';
import type { Transaction } from './Transaction';

// Shown when the other account can't be found.
export const UNKNOWN_ACCOUNT = 'Unknown account';

// Money moved between two accounts in one month: left → right ("there") and right → left ("back").
export interface FlowMonth {
	there: number;
	back: number;
	rows: Transaction[];
}

// Two accounts and the money moved between them. `left` is the one that sent more overall.
export interface Flow {
	left: string;
	right: string;
	months: Map<string, FlowMonth>;
	there: number;
	back: number;
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

// Groups transfers by the two accounts, both directions in one flow. A pair is counted once, from the money-out side.
export function transferFlows(rows: Transaction[], s: FinanceSettings): Flow[] {
	const flows = new Map<string, Flow>();
	for (const t of rows) {
		if (t.kind !== 'transfer' || t.currency !== s.currency) continue;
		if (t.amount > 0 && t.partner?.kind === 'transfer' && t.partner.foundAccount === t.account) continue; // counted from the out side
		const [from, to] = t.amount < 0 ? [t.account, t.foundAccount] : [t.foundAccount, t.account];
		if (from === to) continue;

		// Accounts A-Z for now; flipped below so the bigger sender is on the left.
		const [left, right] = [from, to].sort((a, b) => a.localeCompare(b));
		const id = `${left}⇄${right}`;
		const flow = flows.get(id) ?? { left, right, months: new Map(), there: 0, back: 0 };
		const cell = flow.months.get(t.month) ?? { there: 0, back: 0, rows: [] };
		const side = from === left ? 'there' : 'back';
		cell[side] += Math.abs(t.amount);
		flow[side] += Math.abs(t.amount);
		cell.rows.push(t);
		flow.months.set(t.month, cell);
		flows.set(id, flow);
	}
	return [...flows.values()].map(biggerSenderLeft).sort((a, b) => b.there + b.back - (a.there + a.back));
}

// Swaps the sides when the right account sent more.
function biggerSenderLeft(f: Flow): Flow {
	if (f.back <= f.there) return f;
	const months = new Map([...f.months].map(([m, c]) => [m, { there: c.back, back: c.there, rows: c.rows }]));
	return { left: f.right, right: f.left, months, there: f.back, back: f.there };
}
