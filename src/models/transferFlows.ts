import type { FinanceSettings } from './FinanceSettings';
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
