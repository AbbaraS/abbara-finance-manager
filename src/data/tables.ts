import { REFUND } from '../models/categorise';
import type { CategoryKind } from '../models/Category';
import { setLabel, type Account, type Labels } from '../models/Labels';
import type { Direction } from '../models/Counterparty';
import { UNCATEGORISED } from '../models/rowKind';
import { NO_SUBSCRIPTION, type Period, type SubscriptionStatus } from '../models/Subscription';
import type { Transaction } from '../models/Transaction';
import { monthOf } from '../utils/dates';
import { query, sql } from './sqlite';

// Reading the database tables into your labels and rows, and the SQL that writes them back.

// Rows as sqlite3 returns them.
interface CategoryRow { id: number; name: string; kind: CategoryKind; color: string; icon: string; parent: string | null; person: string | null }
interface NamedRow { id: number; name: string; category?: string; patterns?: string }
interface SubscriptionRow {
	id: number; name: string; type: string | null; counterparty: string | null; match: string; amount: number | null; period: Period;
	payments: number | null; paid_before: number; status: SubscriptionStatus; tags: string;
}
interface CounterpartyRow {
	id: number; name: string; patterns: string; category: string | null; subcategory: string | null; person: string | null;
	account: string | null; direction: Direction; tags: string;
}
interface LabelRow {
	id: string; category: string | null; sub: string | null; person: string | null; subscription: string | null;
	no_subscription: number; note: string | null; tags: string | null; other: string | null; counterparty: string | null;
}
interface DebtRow { id: number; person: string; date: string; amount: number; note: string; reason: string; transaction_id: string | null }
interface TransactionRow {
	id: string; date: string; account: string; description: string; amount: number; currency: string;
	category: string | null; sub: string | null; person: string | null; category_by: string | null; // as last worked out
	subscription: string | null; payment: number | null; counterparty: string | null;
}

// What's in the file.
export interface Tables {
	labels: Labels;
	rows: Transaction[];        // not yet categorised
	saved: Map<string, string>; // transaction id -> resultKey as saved
}

// SQL that finds an id by name (NULL for none). A subcategory is found under its category and person.
const topId = (name?: string) => `(SELECT id FROM Category WHERE parent_id IS NULL AND name = ${sql(name || null)})`;
const personId = (name?: string) => `(SELECT id FROM Person WHERE name = ${sql(name || null)})`;
const accountId = (name?: string) => `(SELECT id FROM Account WHERE name = ${sql(name || null)})`;
const typeId = (name?: string) => `(SELECT id FROM Type WHERE name = ${sql(name || null)})`;
const subscriptionId = (name?: string) => `(SELECT id FROM Subscription WHERE name = ${sql(name || null)})`;
const counterpartyId = (name?: string) => `(SELECT id FROM Counterparty WHERE name = ${sql(name || null)})`;
const categoryId = (category: string, sub = '', person = '') => (!category ? 'NULL' : !sub ? topId(category)
	: `(SELECT id FROM Category WHERE parent_id = ${topId(category)} AND name = ${sql(sub)} AND person_id IS ${personId(person)})`);

// The database's version number (PRAGMA user_version).
export async function readVersion(file: string): Promise<number> {
	return (await query<{ user_version: number }>(file, 'PRAGMA user_version'))[0]?.user_version ?? 0;
}

// Reads every table.
export async function readTables(file: string): Promise<Tables> {
	const get = <T>(text: string) => query<T>(file, text);
	const [categories, people, types, subscriptions, accounts, counterparties, labels, debts, rows] = await Promise.all([
		get<CategoryRow>(`SELECT c.id, c.name, c.kind, c.color, c.icon, p.name AS parent, pe.name AS person FROM Category c
			LEFT JOIN Category p ON p.id = c.parent_id LEFT JOIN Person pe ON pe.id = c.person_id ORDER BY c.position, c.id`),
		get<NamedRow>('SELECT pe.id, pe.name, c.name AS category, pe.patterns FROM Person pe JOIN Category c ON c.id = pe.category_id ORDER BY pe.name'),
		get<NamedRow>('SELECT id, name FROM Type ORDER BY position, id'),
		get<SubscriptionRow>(`SELECT s.id, s.name, t.name AS type, k.name AS counterparty, s.match, s.amount, s.period, s.payments,
			s.paid_before, s.status, s.tags FROM Subscription s LEFT JOIN Type t ON t.id = s.type_id LEFT JOIN Counterparty k ON k.id = s.counterparty_id
			ORDER BY s.position, s.id`),
		get<Account>("SELECT name, match FROM Account WHERE match <> '' OR bank IS NULL ORDER BY name"),
		get<CounterpartyRow>(`SELECT k.id, k.name, k.patterns, COALESCE(p.name, c.name) AS category,
			CASE WHEN c.parent_id IS NULL THEN NULL ELSE c.name END AS subcategory, pe.name AS person, a.name AS account, k.direction, k.tags
			FROM Counterparty k LEFT JOIN Category c ON c.id = k.category_id LEFT JOIN Category p ON p.id = c.parent_id
			LEFT JOIN Person pe ON pe.id = k.person_id LEFT JOIN Account a ON a.id = k.account_id ORDER BY k.position, k.id`),
		get<LabelRow>(`SELECT l.transaction_id AS id, c.name AS category, l.subcategory AS sub, pe.name AS person, s.name AS subscription,
			l.no_subscription, l.note, l.tags, a.name AS other, k.name AS counterparty FROM Label l LEFT JOIN Category c ON c.id = l.category_id
			LEFT JOIN Person pe ON pe.id = l.person_id LEFT JOIN Subscription s ON s.id = l.subscription_id
			LEFT JOIN Account a ON a.id = l.other_account_id LEFT JOIN Counterparty k ON k.id = l.counterparty_id`),
		get<DebtRow>('SELECT d.id, pe.name AS person, d.date, d.amount, d.note, d.reason, d.transaction_id FROM Debt d JOIN Person pe ON pe.id = d.person_id ORDER BY d.date, d.id'),
		get<TransactionRow>(`SELECT t.id, t.date, a.name AS account, t.description, t.amount, t.currency,
			COALESCE(p.name, c.name) AS category, CASE WHEN c.parent_id IS NULL THEN NULL ELSE c.name END AS sub,
			pe.name AS person, t.category_by, s.name AS subscription, t.payment, k.name AS counterparty FROM Trans t
			JOIN Account a ON a.id = t.account_id LEFT JOIN Category c ON c.id = t.category_id LEFT JOIN Category p ON p.id = c.parent_id
			LEFT JOIN Person pe ON pe.id = t.person_id LEFT JOIN Subscription s ON s.id = t.subscription_id
			LEFT JOIN Counterparty k ON k.id = t.counterparty_id ORDER BY t.date, t.rowid`), // statement order within a day
	]);

	const result: Labels = {
		categories: categories.filter((c) => !c.parent).map(({ id, name, kind, color, icon }) => ({ id, name, kind, color, icon })),
		subcategories: categories.filter((c) => c.parent).map((c) => ({ id: c.id, name: c.name, parent: c.parent ?? '', person: c.person ?? '' })),
		people: people.map((p) => ({ id: p.id, name: p.name, category: p.category ?? '', patterns: JSON.parse(p.patterns ?? '[]') })),
		accounts,
		counterparties: counterparties.map((r) => ({
			id: r.id, name: r.name, patterns: JSON.parse(r.patterns), category: r.category ?? '', subcategory: r.subcategory ?? '',
			person: r.person ?? '', account: r.account ?? '', direction: r.direction, tags: JSON.parse(r.tags),
		})),
		types: types.map(({ id, name }) => ({ id, name })),
		subscriptions: subscriptions.map((s) => ({
			id: s.id, name: s.name, type: s.type ?? '', counterparty: s.counterparty ?? '', match: s.match, amount: s.amount, period: s.period,
			payments: s.payments, paidBefore: s.paid_before, status: s.status, tags: JSON.parse(s.tags),
		})),
		transactions: {},
		debts: debts.map((d) => ({ id: d.id, person: d.person, date: d.date, amount: d.amount, note: d.note, reason: d.reason, transaction: d.transaction_id ?? '' })),
	};
	for (const l of labels) {
		setLabel(result, l.id, {
			category: l.category ?? '', sub: l.sub ?? '', person: l.person ?? '', note: l.note ?? '', other: l.other ?? '',
			subscription: l.no_subscription ? NO_SUBSCRIPTION : l.subscription ?? '', tags: l.tags ? JSON.parse(l.tags) : [],
			counterparty: l.counterparty ?? '',
		});
	}

	return {
		labels: result,
		rows: rows.map((t) => ({
			id: t.id, date: t.date, month: monthOf(t.date), day: Number(t.date.slice(8, 10)), account: t.account,
			description: t.description, counterparty: '', amount: t.amount, currency: t.currency.toUpperCase(),
			category: UNCATEGORISED, kind: null, source: 'none', subcategory: '', person: '', note: '', tags: [], autoTags: [],
			otherAccount: '', foundAccount: '', partner: null, refundOf: null, refunds: [], subscription: '', payment: 0, debt: null,
		})),
		saved: new Map(rows.map((t) => [t.id, [
			t.category ?? '', t.sub ?? '', t.person ?? '', t.category_by ?? '', t.subscription ?? '', t.payment ?? 0, t.counterparty ?? '',
		].join('|')])),
	};
}

// The parts of a row's worked-out category that are saved: category, subcategory, person, how, subscription, payment, counterparty.
function resultParts(t: Transaction): [string, string, string, string, string, number, string] {
	const sub = t.kind && t.subcategory !== REFUND ? t.subcategory : ''; // Refund is only shown, not saved
	const by = t.source === 'none' ? '' : t.source === 'person' ? 'rule' : t.source === 'refund' ? 'pair' : t.source; // the file knows edit, rule and pair
	return [t.kind ? t.category : '', sub, t.person, by, t.subscription, t.payment, t.counterparty];
}

// The saved parts as one string, to spot rows that changed.
export function resultKey(t: Transaction): string {
	return resultParts(t).join('|');
}

// SQL that saves a row's worked-out category.
export function resultStatement(t: Transaction): string {
	const [category, sub, person, by, subscription, payment, counterparty] = resultParts(t);
	return `UPDATE Trans SET category_id = ${categoryId(category, sub, person)}, person_id = ${personId(person)},
		category_by = ${sql(by || null)}, subscription_id = ${subscriptionId(subscription)}, payment = ${sql(payment || null)},
		counterparty_id = ${counterpartyId(counterparty)} WHERE id = ${sql(t.id)};`;
}

// SQL that writes everything in your labels over what's in the file.
export function labelStatements(labels: Labels): string[] {
	const { categories, subcategories, people, accounts, counterparties, types, subscriptions, transactions, debts } = labels;
	const ids = (list: { id?: number }[]) => list.flatMap((x) => (x.id ? [x.id] : [])).join(', ');
	const listed = accounts.map((a) => a.name);
	const named = [...new Set([...listed, ...counterparties.map((r) => r.account), ...Object.values(transactions).map((l) => l.other ?? '')])].filter(Boolean);
	const noSub = (l: { subscription?: string }) => l.subscription === NO_SUBSCRIPTION;
	return [
		// Removed people, subscriptions, types, counterparties and categories first, so a new or renamed one can take a freed name.
		`DELETE FROM Person WHERE id NOT IN (${ids(people)});`,
		`DELETE FROM Counterparty WHERE id NOT IN (${ids(counterparties)});`,
		`DELETE FROM Subscription WHERE id NOT IN (${ids(subscriptions)});`,
		`DELETE FROM Type WHERE id NOT IN (${ids(types)});`,
		`DELETE FROM Category WHERE id NOT IN (${ids([...categories, ...subcategories])});`,
		// Categories, then people (each is under one), then subcategories (some belong to a person).
		...categories.map((c, i) => upsert('Category', c.id, { name: sql(c.name), kind: sql(c.kind), color: sql(c.color), icon: sql(c.icon), position: sql(i) })),
		...people.map((p) => upsert('Person', p.id, { name: sql(p.name), category_id: topId(p.category), patterns: sql(JSON.stringify(p.patterns ?? [])) })),
		...subcategories.map((s) => upsert('Category', s.id, { name: sql(s.name), parent_id: topId(s.parent), person_id: personId(s.person) })),
		// Types and subscriptions, in order.
		...types.map((t, i) => upsert('Type', t.id, { name: sql(t.name), position: sql(i) })),
		...subscriptions.map((s, i) => upsert('Subscription', s.id, {
			name: sql(s.name), type_id: typeId(s.type), match: sql(s.match), amount: sql(s.amount), period: sql(s.period),
			payments: sql(s.payments), paid_before: sql(s.paidBefore), status: sql(s.status), position: sql(i), tags: sql(JSON.stringify(s.tags ?? [])),
		})),
		// Accounts: every named one exists, match text as set; ones you removed (no bank, unused) go.
		...named.map((n) => `INSERT OR IGNORE INTO Account (name) VALUES (${sql(n)});`),
		`UPDATE Account SET match = '';`,
		...accounts.map((a) => `UPDATE Account SET match = ${sql(a.match)} WHERE name = ${sql(a.name)};`),
		`DELETE FROM Account WHERE bank IS NULL AND name NOT IN (${named.map(sql).join(', ')}) AND id NOT IN (SELECT account_id FROM Trans);`,
		// Counterparties in order (kept by id, so transactions stay linked), then labels.
		...counterparties.map((r, i) => upsert('Counterparty', r.id, {
			position: sql(i), name: sql(r.name), patterns: sql(JSON.stringify(r.patterns)), category_id: categoryId(r.category, r.subcategory, r.person),
			person_id: personId(r.person), account_id: accountId(r.account), direction: sql(r.direction), tags: sql(JSON.stringify(r.tags ?? [])),
		})),
		// Subscriptions point at counterparties, which exist only now.
		...subscriptions.map((s) => `UPDATE Subscription SET counterparty_id = ${counterpartyId(s.counterparty)} WHERE name = ${sql(s.name)};`),
		// Debts (people exist now): removed ones go, the rest are kept by id.
		`DELETE FROM Debt WHERE id NOT IN (${ids(debts)});`,
		...debts.map((d) => upsert('Debt', d.id, {
			person_id: personId(d.person), date: sql(d.date), amount: sql(d.amount), note: sql(d.note), reason: sql(d.reason), transaction_id: sql(d.transaction || null),
		})),
		'DELETE FROM Label;',
		...Object.entries(transactions).map(([id, l]) => `INSERT INTO Label
			(transaction_id, category_id, subcategory, person_id, subscription_id, no_subscription, note, tags, other_account_id, counterparty_id)
			VALUES (${sql(id)}, ${topId(l.category)}, ${sql(l.sub || null)}, ${personId(l.person)}, ${subscriptionId(noSub(l) ? '' : l.subscription)},
			${noSub(l) ? 1 : 0}, ${sql(l.note || null)}, ${sql(l.tags?.length ? JSON.stringify(l.tags) : null)}, ${accountId(l.other)},
			${counterpartyId(l.counterparty)});`),
	];
}

// An INSERT that updates the row with the same id instead, or gets a new id when there's none yet.
function upsert(table: string, id: number | undefined, values: Record<string, string>): string {
	const cols = Object.keys(values);
	return `INSERT INTO ${table} (id, ${cols.join(', ')}) VALUES (${sql(id)}, ${Object.values(values).join(', ')})
		ON CONFLICT (id) DO UPDATE SET ${cols.map((c) => `${c} = excluded.${c}`).join(', ')};`;
}

// Gives new categories, subcategories, people, types, subscriptions, counterparties and debts the ids the file gave them.
export async function readIds(file: string, labels: Labels): Promise<void> {
	const lists = [labels.categories, labels.subcategories, labels.people, labels.types, labels.subscriptions, labels.counterparties, labels.debts];
	if (lists.every((list) => list.every((x) => x.id))) return;
	const [categories, people, types, subscriptions, counterparties, debts] = await Promise.all([
		query<CategoryRow>(file, `SELECT c.id, c.name, p.name AS parent, pe.name AS person FROM Category c
			LEFT JOIN Category p ON p.id = c.parent_id LEFT JOIN Person pe ON pe.id = c.person_id`),
		query<NamedRow>(file, 'SELECT id, name FROM Person'),
		query<NamedRow>(file, 'SELECT id, name FROM Type'),
		query<NamedRow>(file, 'SELECT id, name FROM Subscription'),
		query<NamedRow>(file, 'SELECT id, name FROM Counterparty'),
		query<DebtRow>(file, 'SELECT d.id, pe.name AS person, d.date, d.amount, d.note, d.reason, d.transaction_id FROM Debt d JOIN Person pe ON pe.id = d.person_id'),
	]);
	const fill = (list: { id?: number; name: string }[], rows: NamedRow[]) => {
		for (const x of list) x.id ??= rows.find((r) => r.name === x.name)?.id;
	};
	for (const c of labels.categories) c.id ??= categories.find((x) => !x.parent && x.name === c.name)?.id;
	for (const s of labels.subcategories) s.id ??= categories.find((x) => x.parent === s.parent && (x.person ?? '') === s.person && x.name === s.name)?.id;
	fill(labels.people, people);
	fill(labels.types, types);
	fill(labels.subscriptions, subscriptions);
	fill(labels.counterparties, counterparties);
	// Debts have no name: a new one takes the first unclaimed row with the same values.
	const taken = new Set(labels.debts.map((d) => d.id));
	for (const d of labels.debts) {
		if (d.id) continue;
		d.id = debts.find((r) => !taken.has(r.id) && r.person === d.person && r.date === d.date && r.amount === d.amount
			&& r.note === d.note && r.reason === d.reason && (r.transaction_id ?? '') === d.transaction)?.id;
		taken.add(d.id);
	}
}
