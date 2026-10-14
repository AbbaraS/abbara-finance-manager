import type { CategoryKind } from '../models/Category';
import type { Direction } from '../models/Counterparty';
import { REFUND } from '../models/categorise';
import { setLabel, type Labels } from '../models/Labels';
import { UNCATEGORISED } from '../models/rowKind';
import { NO_SUBSCRIPTION, type Period } from '../models/Subscription';
import type { CategorySource, Transaction } from '../models/Transaction';
import { UNKNOWN_ACCOUNT } from '../models/transferFlows';
import { monthOf } from '../utils/dates';
import { query, sql } from './sqlite';

// Reading the database (made by myFinances: schema.sql) into your lists, decisions and finished rows, and the SQL
// that writes your lists and decisions back. The rows are worked out by Python (build.py), never here.

// A transfer pair: found by the rules, linked by you ('confirmed') or unlinked by you ('rejected').
export type TransferStatus = 'found' | 'confirmed' | 'rejected';
export interface TransferLink { out: Transaction; into: Transaction; status: TransferStatus }

// What's in the file.
export interface Tables {
	labels: Labels;
	rows: Transaction[];   // worked out, oldest first
	links: TransferLink[]; // every transfer pair, also ones you unlinked
}

// Rows as sqlite3 returns them.
interface TransRow {
	id: string; date: string; account: string; description: string; amount: number; currency: string;
	category: string | null; sub: string | null; kind: CategoryKind | null; person: string | null; recipient: string | null;
	other: string | null; why: string | null; subscription: string | null; note: string | null; hand_other: string | null;
}
interface CategoryRow { id: number; name: string; kind: CategoryKind | null; color: string; icon: string; parent: string | null }
interface NamedRow { id: number; name: string }
interface AccountRow { id: number; name: string; color: string; icon: string }
interface PatternRow { text: string; owner: number; account: string | null; direction: Direction }
interface RecipientRow { id: number; name: string; category: string | null; sub: string | null }
interface SubscriptionRow {
	id: number; name: string; recipient: string | null; amount: number | null; period: Period; instalments_no: number | null; last_date: string | null;
}
interface OverrideRow { id: string; category: string | null; sub: string | null; person: string | null; recipient: string | null; account: string | null }
interface DebtRow { id: number; person: string; date: string; amount: number; note: string; reason: string; transaction_id: string | null }
type Pair = { a: string; b: string; status?: string };
type Named = { name: string; owner: string };

// Result.why -> where the category came from, in the plugin's words.
const SOURCES: Record<string, CategorySource> = {
	override: 'edit', person: 'person', account: 'rule', subscription: 'rule', recipient: 'rule', transfer: 'pair', refund: 'refund', none: 'none',
};

// "top-level name, subcategory name" for a category id column.
const CATEGORY = (c: string, p: string) => `COALESCE(${p}.name, ${c}.name) AS category, CASE WHEN ${c}.parent_id IS NULL THEN NULL ELSE ${c}.name END AS sub`;

// The database's version number (PRAGMA user_version, set by myFinances db.py).
export async function readVersion(file: string): Promise<number> {
	return (await query<{ user_version: number }>(file, 'PRAGMA user_version'))[0]?.user_version ?? 0;
}

// Reads every table.
export async function readTables(file: string): Promise<Tables> {
	const get = <T>(text: string) => query<T>(file, text);
	const [trans, categories, people, accounts, recipients, patterns, subscriptions, autoTags, handTags, debts, transfers, refunds, overrides, picks] = await Promise.all([
		get<TransRow>(`SELECT t.id, t.date, a.name AS account, t.description, t.amount, a.currency, ${CATEGORY('c', 'p')},
			COALESCE(p.kind, c.kind) AS kind, pe.name AS person, r.name AS recipient, o.name AS other, res.why, s.name AS subscription,
			n.text AS note, ho.name AS hand_other
			FROM Trans t JOIN Account a ON a.id = t.account_id
			LEFT JOIN Result res ON res.transaction_id = t.id
			LEFT JOIN Category c ON c.id = res.category_id LEFT JOIN Category p ON p.id = c.parent_id
			LEFT JOIN Person pe ON pe.id = res.person_id LEFT JOIN Recipient r ON r.id = res.recipient_id LEFT JOIN Account o ON o.id = res.account_id
			LEFT JOIN SubscriptionPayment sp ON sp.transaction_id = t.id AND sp.status <> 'rejected' LEFT JOIN Subscription s ON s.id = sp.subscription_id
			LEFT JOIN Note n ON n.transaction_id = t.id
			LEFT JOIN Override ov ON ov.transaction_id = t.id LEFT JOIN Account ho ON ho.id = ov.account_id
			ORDER BY t.date, t.rowid`), // statement order within a day
		get<CategoryRow>('SELECT c.id, c.name, c.kind, c.color, c.icon, p.name AS parent FROM Category c LEFT JOIN Category p ON p.id = c.parent_id ORDER BY c.position, c.id'),
		get<NamedRow>('SELECT id, name FROM Person ORDER BY name'),
		get<AccountRow>('SELECT id, name, color, icon FROM Account ORDER BY position, id'),
		get<RecipientRow>(`SELECT r.id, r.name, ${CATEGORY('c', 'p')} FROM Recipient r LEFT JOIN Category c ON c.id = r.category_id LEFT JOIN Category p ON p.id = c.parent_id ORDER BY r.name`),
		get<PatternRow & { kind: string }>(`SELECT p.text, COALESCE(p.recipient_id, p.person_id, p.account_id, p.subscription_id) AS owner,
			CASE WHEN p.recipient_id IS NOT NULL THEN 'r' WHEN p.person_id IS NOT NULL THEN 'p' WHEN p.account_id IS NOT NULL THEN 'a' ELSE 's' END AS kind,
			ia.name AS account, p.direction FROM Pattern p LEFT JOIN Account ia ON ia.id = p.in_account_id ORDER BY p.id`),
		get<SubscriptionRow>(`SELECT s.id, s.name, r.name AS recipient, s.amount, s.period, s.instalments_no, s.last_date
			FROM Subscription s LEFT JOIN Recipient r ON r.id = s.recipient_id ORDER BY s.name`),
		get<Named>(`SELECT tg.name, COALESCE('r:' || r.name, 's:' || s.name) AS owner FROM AutoTag at JOIN Tag tg ON tg.id = at.tag_id
			LEFT JOIN Recipient r ON r.id = at.recipient_id LEFT JOIN Subscription s ON s.id = at.subscription_id`),
		get<Named>('SELECT tg.name, tt.transaction_id AS owner FROM TransactionTag tt JOIN Tag tg ON tg.id = tt.tag_id'),
		get<DebtRow>('SELECT d.id, pe.name AS person, d.date, d.amount, d.note, d.reason, d.transaction_id FROM Debt d JOIN Person pe ON pe.id = d.person_id ORDER BY d.date, d.id'),
		get<Pair>('SELECT out_id AS a, in_id AS b, status FROM Transfer'),
		get<Pair>('SELECT purchase_id AS a, refund_id AS b, status FROM Refund'),
		get<OverrideRow>(`SELECT ov.transaction_id AS id, ${CATEGORY('c', 'p')}, pe.name AS person, r.name AS recipient, a.name AS account
			FROM Override ov LEFT JOIN Category c ON c.id = ov.category_id LEFT JOIN Category p ON p.id = c.parent_id
			LEFT JOIN Person pe ON pe.id = ov.person_id LEFT JOIN Recipient r ON r.id = ov.recipient_id LEFT JOIN Account a ON a.id = ov.account_id`),
		get<{ id: string; name: string; status: string }>(`SELECT sp.transaction_id AS id, s.name, sp.status FROM SubscriptionPayment sp
			JOIN Subscription s ON s.id = sp.subscription_id WHERE sp.status <> 'found'`),
	]);
	const labels = toLabels(categories, people, accounts, recipients, patterns, subscriptions, autoTags, debts);
	for (const o of overrides) setLabel(labels, o.id, { category: o.category ?? '', sub: o.sub ?? '', person: o.person ?? '', counterparty: o.recipient ?? '', other: o.account ?? '' });
	for (const t of trans) if (t.note) setLabel(labels, t.id, { note: t.note });
	for (const t of handTags) setLabel(labels, t.owner, { tags: [...(labels.transactions[t.owner]?.tags ?? []), t.name] });
	for (const p of picks) setLabel(labels, p.id, { subscription: p.status === 'rejected' ? NO_SUBSCRIPTION : p.name });
	for (const r of refunds) if (r.status === 'rejected') setLabel(labels, r.b, { notRefundOf: [...(labels.transactions[r.b]?.notRefundOf ?? []), r.a] });
	const { rows, links } = toRows(trans, labels, autoTags, transfers, refunds);
	return { labels, rows, links };
}

// Your lists, from their tables.
function toLabels(categories: CategoryRow[], people: NamedRow[], accounts: AccountRow[], recipients: RecipientRow[], patterns: (PatternRow & { kind: string })[],
	subscriptions: SubscriptionRow[], autoTags: Named[], debts: DebtRow[]): Labels {
	const of = (kind: string, id: number) => patterns.filter((p) => p.kind === kind && p.owner === id);
	const tagsOf = (owner: string) => autoTags.filter((t) => t.owner === owner).map((t) => t.name);
	const people_ = categories.find((c) => !c.parent && c.kind === 'people')?.name ?? '';
	return {
		categories: categories.filter((c) => !c.parent).map((c) => ({ id: c.id, name: c.name, kind: c.kind ?? 'spending', color: c.color, icon: c.icon })),
		subcategories: categories.filter((c) => c.parent).map((c) => ({ id: c.id, name: c.name, parent: c.parent ?? '', person: '' })),
		people: people.map((p) => ({ id: p.id, name: p.name, category: people_, patterns: of('p', p.id).map((x) => x.text) })),
		accounts: accounts.map((a) => ({
			id: a.id, name: a.name, color: a.color, icon: a.icon,
			patterns: of('a', a.id).map((x) => ({ text: x.text, inAccount: x.account ?? '', direction: x.direction })),
		})),
		// A recipient's patterns share one account and direction (the first one's).
		counterparties: recipients.map((r) => {
			const mine = of('r', r.id);
			return {
				id: r.id, name: r.name, patterns: mine.map((x) => x.text), category: r.category ?? '', subcategory: r.sub ?? '',
				account: mine[0]?.account ?? '', direction: mine[0]?.direction ?? '', tags: tagsOf(`r:${r.name}`),
			};
		}),
		types: [{ name: 'Subscription' }, { name: 'Instalments' }],
		subscriptions: subscriptions.map((s) => ({
			id: s.id, name: s.name, type: s.instalments_no === null ? 'Subscription' : 'Instalments', counterparty: s.recipient ?? '',
			match: of('s', s.id).map((x) => x.text).join(' | '), amount: s.amount, period: s.period, payments: s.instalments_no, paidBefore: 0,
			status: s.last_date ? 'cancelled' : '', tags: tagsOf(`s:${s.name}`), // no last date = active
		})),
		transactions: {},
		debts: debts.map((d) => ({ id: d.id, person: d.person, date: d.date, amount: d.amount, note: d.note, reason: d.reason, transaction: d.transaction_id ?? '' })),
	};
}

// Finished rows (as Python left them), with transfer partners, refunds and payment numbers.
function toRows(trans: TransRow[], labels: Labels, autoTags: Named[], transfers: Pair[], refunds: Pair[]): { rows: Transaction[]; links: TransferLink[] } {
	const tagsOf = (owner: string) => autoTags.filter((t) => t.owner === owner).map((t) => t.name);
	const debts = new Map(labels.debts.filter((d) => d.transaction).map((d) => [d.transaction, d]));
	const count = new Map<string, number>();
	const rows = trans.map((r): Transaction => {
		const kind = r.category ? r.kind : null;
		const tags = labels.transactions[r.id]?.tags ?? [];
		const auto = [...tagsOf(`r:${r.recipient}`), ...tagsOf(`s:${r.subscription}`)];
		let payment = 0;
		if (r.subscription && r.amount < 0) count.set(r.subscription, payment = (count.get(r.subscription) ?? 0) + 1); // refunds aren't numbered
		return {
			id: r.id, date: r.date, month: monthOf(r.date), day: Number(r.date.slice(8, 10)), account: r.account, description: r.description,
			counterparty: r.recipient ?? '', amount: r.amount, currency: r.currency,
			category: r.category ?? UNCATEGORISED, kind, source: SOURCES[r.why ?? 'none'] ?? 'none',
			subcategory: r.sub || (kind === 'spending' && r.amount > 0 ? REFUND : ''), // money back goes into its category
			person: kind === 'people' ? r.person ?? '' : '',
			subscription: r.subscription ?? '', payment, note: r.note ?? '',
			tags, autoTags: [...new Set(auto)].filter((x) => !tags.includes(x)),
			otherAccount: r.hand_other ?? '', foundAccount: kind === 'transfer' ? r.other ?? '' : '',
			partner: null, refundOf: null, refunds: [], debt: debts.get(r.id) ?? null,
		};
	});

	// Pairs: transfers both ways (not ones you unlinked), refunds with their purchase.
	const byId = new Map(rows.map((r) => [r.id, r]));
	const links: TransferLink[] = [];
	for (const { a, b, status } of transfers) {
		const out = byId.get(a), into = byId.get(b);
		if (!out || !into) continue;
		links.push({ out, into, status: status as TransferStatus });
		if (status === 'rejected') continue;
		out.partner = into;
		into.partner = out;
	}
	for (const r of rows) if (r.kind === 'transfer') r.foundAccount ||= r.partner?.account ?? UNKNOWN_ACCOUNT;
	for (const { a, b, status } of refunds) {
		const purchase = byId.get(a), refund = byId.get(b);
		if (!purchase || !refund || status === 'rejected') continue;
		refund.refundOf = purchase;
		purchase.refunds.push(refund);
	}
	return { rows, links };
}

// SQL that finds an id by name (NULL for none).
const by = (table: string) => (name?: string) => `(SELECT id FROM ${table} WHERE name = ${sql(name || null)})`;
const personId = by('Person'), recipientId = by('Recipient'), accountId = by('Account'), subscriptionId = by('Subscription'), tagId = by('Tag');
const topId = (name?: string) => `(SELECT id FROM Category WHERE parent_id IS NULL AND name = ${sql(name || null)})`;
const categoryId = (category?: string, sub?: string) => (!category ? 'NULL' : !sub ? topId(category)
	: `(SELECT id FROM Category WHERE parent_id = ${topId(category)} AND name = ${sql(sub)})`);
const split = (text: string) => text.split('|').map((x) => x.trim()).filter(Boolean);

// SQL that writes your lists and decisions over what's in the file. Rows keep their ids (removed ones go), so
// nothing that points at them breaks. The rules' own results are left for Python (build.py --rules).
export function labelStatements(labels: Labels): string[] {
	const { categories, subcategories, people, accounts, counterparties, subscriptions, transactions, debts } = labels;
	const ids = (list: { id?: number }[]) => list.flatMap((x) => (x.id ? [x.id] : [])).join(', ');
	const notSubs = Object.keys(transactions).filter((id) => transactions[id].subscription === NO_SUBSCRIPTION);
	const tags = [...new Set([...counterparties, ...subscriptions, ...Object.values(transactions)].flatMap((x) => x.tags ?? []))];
	return [
		// Removed items first, so a new or renamed one can take a freed name.
		`DELETE FROM Person WHERE id NOT IN (${ids(people)});`,
		`DELETE FROM Recipient WHERE id NOT IN (${ids(counterparties)});`,
		`DELETE FROM Subscription WHERE id NOT IN (${ids(subscriptions)});`,
		`DELETE FROM Category WHERE id NOT IN (${ids([...categories, ...subcategories])});`,
		`DELETE FROM Account WHERE id NOT IN (${ids(accounts)}) AND id NOT IN (SELECT account_id FROM Trans);`,
		// Lists, in your order.
		...categories.map((c, i) => upsert('Category', c.id, { name: sql(c.name), parent_id: 'NULL', kind: sql(c.kind), color: sql(c.color), icon: sql(c.icon), position: sql(i) })),
		...subcategories.map((s) => upsert('Category', s.id, { name: sql(s.name), parent_id: topId(s.parent), position: sql(subcategories.filter((x) => x.parent === s.parent).indexOf(s)) })),
		...people.map((p) => upsert('Person', p.id, { name: sql(p.name) })),
		...accounts.map((a, i) => (a.id ? `UPDATE Account SET name = ${sql(a.name)}, color = ${sql(a.color)}, icon = ${sql(a.icon)}, position = ${i} WHERE id = ${a.id};`
			: `INSERT OR IGNORE INTO Account (key, name, bank, type, currency, position, color, icon) VALUES (${sql(a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))},
				${sql(a.name)}, '', 'current', 'GBP', ${i}, ${sql(a.color)}, ${sql(a.icon)});`)),
		...counterparties.map((r) => upsert('Recipient', r.id, { name: sql(r.name), category_id: categoryId(r.category, r.subcategory) })),
		...subscriptions.map((s) => upsert('Subscription', s.id, {
			name: sql(s.name), recipient_id: recipientId(s.counterparty), amount: sql(s.amount), period: sql(s.period), instalments_no: sql(s.payments),
		})),
		// Cancelled: last date = its last payment (kept if already set); active: none.
		...subscriptions.map((s) => (s.status === 'cancelled'
			? `UPDATE Subscription SET last_date = COALESCE(last_date, (SELECT max(t.date) FROM SubscriptionPayment sp JOIN Trans t ON t.id = sp.transaction_id
				WHERE sp.subscription_id = Subscription.id AND sp.status <> 'rejected'), date('now')) WHERE name = ${sql(s.name)};`
			: `UPDATE Subscription SET last_date = NULL WHERE name = ${sql(s.name)};`)),
		// Patterns (never an empty one: it would match everything) and automatic tags, written again from the lists.
		'DELETE FROM Pattern;',
		...people.flatMap((p) => (p.patterns ?? []).map((t) => t.trim()).filter(Boolean).map((t) => `INSERT INTO Pattern (text, person_id) VALUES (${sql(t)}, ${personId(p.name)});`)),
		...accounts.flatMap((a) => a.patterns.filter((p) => p.text.trim()).map((p) => `INSERT INTO Pattern (text, account_id, in_account_id, direction)
			VALUES (${sql(p.text.trim())}, ${accountId(a.name)}, ${accountId(p.inAccount)}, ${sql(p.direction)});`)),
		...counterparties.flatMap((r) => r.patterns.map((t) => t.trim()).filter(Boolean).map((t) => `INSERT INTO Pattern (text, recipient_id, in_account_id, direction)
			VALUES (${sql(t)}, ${recipientId(r.name)}, ${accountId(r.account)}, ${sql(r.direction)});`)),
		...subscriptions.flatMap((s) => split(s.match).map((t) => `INSERT INTO Pattern (text, subscription_id) VALUES (${sql(t)}, ${subscriptionId(s.name)});`)),
		...tags.map((t) => `INSERT OR IGNORE INTO Tag (name) VALUES (${sql(t)});`),
		'DELETE FROM AutoTag;',
		...counterparties.flatMap((r) => (r.tags ?? []).map((t) => `INSERT INTO AutoTag (tag_id, recipient_id) VALUES (${tagId(t)}, ${recipientId(r.name)});`)),
		...subscriptions.flatMap((s) => (s.tags ?? []).map((t) => `INSERT INTO AutoTag (tag_id, subscription_id) VALUES (${tagId(t)}, ${subscriptionId(s.name)});`)),
		// Debts: removed ones go, the rest are kept by id.
		`DELETE FROM Debt WHERE id NOT IN (${ids(debts)});`,
		...debts.map((d) => upsert('Debt', d.id, {
			person_id: personId(d.person), date: sql(d.date), amount: sql(d.amount), note: sql(d.note), reason: sql(d.reason), transaction_id: sql(d.transaction || null),
		})),
		// Your decisions on single transactions.
		'DELETE FROM Override;', 'DELETE FROM Note;', 'DELETE FROM TransactionTag;',
		`DELETE FROM SubscriptionPayment WHERE status = 'confirmed' OR (status = 'rejected' AND transaction_id NOT IN (${notSubs.map(sql).join(', ')}));`,
		"DELETE FROM Refund WHERE status = 'rejected';",
		...Object.entries(transactions).flatMap(([id, l]) => [
			...(l.category || l.person || l.counterparty || l.other ? [`INSERT INTO Override (transaction_id, category_id, person_id, recipient_id, account_id)
				VALUES (${sql(id)}, ${categoryId(l.category, l.sub)}, ${personId(l.person)}, ${recipientId(l.counterparty)}, ${accountId(l.other)});`] : []),
			...(l.note ? [`INSERT INTO Note VALUES (${sql(id)}, ${sql(l.note)});`] : []),
			...(l.tags ?? []).map((t) => `INSERT OR IGNORE INTO TransactionTag VALUES (${sql(id)}, ${tagId(t)});`),
			// "Not a subscription payment" keeps the subscription it was taken from (any one will do for a new one).
			...(l.subscription === NO_SUBSCRIPTION ? [`INSERT INTO SubscriptionPayment VALUES (${sql(id)}, COALESCE((SELECT subscription_id FROM SubscriptionPayment
				WHERE transaction_id = ${sql(id)}), (SELECT min(id) FROM Subscription)), 'rejected') ON CONFLICT (transaction_id) DO UPDATE SET status = 'rejected';`]
				: l.subscription ? [`INSERT OR REPLACE INTO SubscriptionPayment VALUES (${sql(id)}, ${subscriptionId(l.subscription)}, 'confirmed');`] : []),
			...(l.notRefundOf ?? []).map((p) => `INSERT OR REPLACE INTO Refund VALUES (${sql(p)}, ${sql(id)}, 'rejected');`),
		]),
	];
}

// An INSERT that updates the row with the same id instead, or gets a new id when there's none yet.
function upsert(table: string, id: number | undefined, values: Record<string, string>): string {
	const cols = Object.keys(values);
	return `INSERT INTO ${table} (id, ${cols.join(', ')}) VALUES (${sql(id)}, ${Object.values(values).join(', ')})
		ON CONFLICT (id) DO UPDATE SET ${cols.map((c) => `${c} = excluded.${c}`).join(', ')};`;
}

// Gives new items in your lists the ids the file gave them (same lists, read again), so the next save keeps them.
export function fillIds(labels: Labels, fresh: Labels): void {
	const fill = (list: { id?: number; name: string }[], from: { id?: number; name: string }[]) => {
		for (const x of list) x.id ??= from.find((y) => y.name === x.name)?.id;
	};
	fill(labels.categories, fresh.categories);
	for (const s of labels.subcategories) s.id ??= fresh.subcategories.find((x) => x.parent === s.parent && x.name === s.name)?.id;
	fill(labels.people, fresh.people);
	fill(labels.accounts, fresh.accounts);
	fill(labels.counterparties, fresh.counterparties);
	fill(labels.subscriptions, fresh.subscriptions);
	const taken = new Set(labels.debts.map((d) => d.id));
	for (const d of labels.debts) {
		if (d.id) continue;
		d.id = fresh.debts.find((r) => !taken.has(r.id) && r.person === d.person && r.date === d.date && r.amount === d.amount
			&& r.note === d.note && r.reason === d.reason && r.transaction === d.transaction)?.id;
		taken.add(d.id);
	}
}
