import { existsSync, watch, type FSWatcher } from 'fs';
import { homedir } from 'os';
import { basename, dirname, resolve } from 'path';
import { debounce, FileSystemAdapter, Notice, type App } from 'obsidian';
import { copyDefaultLabels } from '../defaults/defaultLabels';
import type { CategoryKind } from '../models/Category';
import type { Labels } from '../models/Labels';
import { REFUND } from '../models/categorise';
import { UNCATEGORISED } from '../models/rowKind';
import type { Period } from '../models/Subscription';
import type { CategorySource, Transaction } from '../models/Transaction';
import { UNKNOWN_ACCOUNT } from '../models/transferFlows';
import { monthOf } from '../utils/dates';
import { query } from './sqlite';

// The dev database (dev-finance.db, rebuilt by `make dev` in myFinances), read only.
// Python has already worked out every row (Result, Transfer, Refund, SubscriptionPayment), so nothing is categorised here.

// Rows as sqlite3 returns them.
interface TransRow {
	id: string; date: string; account: string; description: string; amount: number; currency: string;
	category: string | null; sub: string | null; kind: CategoryKind | null; person: string | null; recipient: string | null;
	other: string | null; why: string | null; subscription: string | null; note: string | null;
}
interface CategoryRow { name: string; kind: CategoryKind | null; color: string; icon: string; parent: string | null }
interface RecipientRow { name: string; category: string | null; sub: string | null }
interface SubscriptionRow {
	id: number; name: string; recipient: string | null; amount: number | null; period: Period;
	instalments_no: number | null; paid_before: number; last_date: string | null;
}
interface DebtRow { id: number; person: string; date: string; amount: number; note: string; reason: string; transaction_id: string | null }
type Pair = { a: string; b: string };
type Named = { name: string; owner: string };

// Result.why -> where the category came from, in the plugin's words.
const SOURCES: Record<string, CategorySource> = {
	override: 'edit', person: 'person', account: 'rule', subscription: 'rule', recipient: 'rule', transfer: 'pair', refund: 'refund', none: 'none',
};

// "SELECT top-level name, subcategory name" for a category id column.
const CATEGORY = (c: string, p: string) => `COALESCE(${p}.name, ${c}.name) AS category, CASE WHEN ${c}.parent_id IS NULL THEN NULL ELSE ${c}.name END AS sub`;

export class DevDatabase {
	labels: Labels = copyDefaultLabels();
	rows: Transaction[] = []; // already worked out, oldest first
	error = '';               // why the file can't be used
	private watcher: FSWatcher | null = null;

	constructor(private app: App, private setting: () => string) {}

	// Full path of the file: "~/..." is your home folder, a relative path is inside the vault, '' = not set.
	get file(): string {
		const s = this.setting().trim().replace(/^~(?=$|\/)/, homedir());
		const adapter = this.app.vault.adapter;
		return s && resolve(adapter instanceof FileSystemAdapter ? adapter.getBasePath() : '', s);
	}

	// Reads every table. On a problem, keeps everything empty and says why.
	async load(): Promise<void> {
		try {
			const file = this.file;
			if (!file) throw new Error('set the dev database file in settings');
			if (!existsSync(file)) throw new Error(`there's no file at ${file}. Run make dev in myFinances`);
			this.read(await readAll(file));
			this.error = '';
		} catch (e) {
			const error = `Finance (dev): can't use the database: ${(e as Error).message}.`;
			if (error !== this.error) new Notice(error, 0);
			this.error = error;
			this.labels = copyDefaultLabels();
			this.rows = [];
		}
	}

	// Turns the tables into your lists (Labels) and finished rows.
	private read(t: Awaited<ReturnType<typeof readAll>>): void {
		const group = (list: Named[]) => list.reduce((m, x) => m.set(x.owner, [...(m.get(x.owner) ?? []), x.name]), new Map<string, string[]>());
		const patterns = group(t.patterns);
		const recipientTags = group(t.autoTags.filter((x) => x.owner.startsWith('r:')).map((x) => ({ ...x, owner: x.owner.slice(2) })));
		const subscriptionTags = group(t.autoTags.filter((x) => x.owner.startsWith('s:')).map((x) => ({ ...x, owner: x.owner.slice(2) })));
		const handTags = group(t.handTags);

		// Lists.
		const tops = t.categories.filter((c) => !c.parent && c.kind);
		const people = tops.find((c) => c.kind === 'people')?.name ?? '';
		const subs = new Map(t.subscriptions.map((s) => [s.name, s]));
		this.labels = {
			categories: tops.map((c) => ({ name: c.name, kind: c.kind as CategoryKind, color: c.color, icon: c.icon })),
			subcategories: t.categories.filter((c) => c.parent).map((c) => ({ name: c.name, parent: c.parent ?? '', person: '' })),
			people: t.people.map((p) => ({ name: p.name, category: people })),
			accounts: t.accounts.map((a) => ({ name: a.name, match: '' })),
			counterparties: t.recipients.map((r) => ({
				name: r.name, patterns: patterns.get(r.name) ?? [], category: r.category ?? '', subcategory: r.sub ?? '', account: '', direction: '', tags: recipientTags.get(r.name) ?? [],
			})),
			types: [{ name: 'Subscription' }, { name: 'Instalments' }],
			subscriptions: t.subscriptions.map((s) => ({
				id: s.id, name: s.name, type: s.instalments_no === null ? 'Subscription' : 'Instalments', counterparty: s.recipient ?? '', match: '', amount: s.amount,
				period: s.period, payments: s.instalments_no, paidBefore: s.paid_before, status: s.last_date ? 'cancelled' : '', // no last date = active
				tags: subscriptionTags.get(s.name) ?? [],
			})),
			transactions: {},
			debts: t.debts.map((d) => ({ id: d.id, person: d.person, date: d.date, amount: d.amount, note: d.note, reason: d.reason, transaction: d.transaction_id ?? '' })),
		};

		// Rows, as categorise() would leave them.
		const debts = new Map(this.labels.debts.filter((d) => d.transaction).map((d) => [d.transaction, d]));
		const count = new Map<string, number>();
		this.rows = t.trans.map((r): Transaction => {
			const kind = r.category ? r.kind : null;
			const tags = handTags.get(r.id) ?? [];
			const auto = [...(recipientTags.get(r.recipient ?? '') ?? []), ...(subscriptionTags.get(r.subscription ?? '') ?? [])];
			const sub = subs.get(r.subscription ?? '');
			let payment = 0;
			if (sub && r.amount < 0) count.set(sub.name, payment = (count.get(sub.name) ?? sub.paid_before) + 1); // refunds aren't numbered
			return {
				id: r.id, date: r.date, month: monthOf(r.date), day: Number(r.date.slice(8, 10)), account: r.account, description: r.description,
				counterparty: r.recipient ?? '', amount: r.amount, currency: r.currency,
				category: r.category ?? UNCATEGORISED, kind, source: SOURCES[r.why ?? 'none'] ?? 'none',
				subcategory: r.sub || (kind === 'spending' && r.amount > 0 ? REFUND : ''), // money back goes into its category
				person: kind === 'people' ? r.person ?? '' : '',
				subscription: r.subscription ?? '', payment, note: r.note ?? '',
				tags, autoTags: [...new Set(auto)].filter((x) => !tags.includes(x)),
				otherAccount: '', foundAccount: kind === 'transfer' ? r.other ?? '' : '',
				partner: null, refundOf: null, refunds: [], debt: debts.get(r.id) ?? null,
			};
		});

		// Pairs: transfers both ways, refunds with their purchase.
		const byId = new Map(this.rows.map((r) => [r.id, r]));
		for (const { a, b } of t.transfers) {
			const out = byId.get(a), into = byId.get(b);
			if (!out || !into) continue; // the other side is outside the loaded months
			out.partner = into;
			into.partner = out;
		}
		for (const r of this.rows) if (r.kind === 'transfer') r.foundAccount ||= r.partner?.account ?? UNKNOWN_ACCOUNT;
		for (const { a, b } of t.refunds) {
			const purchase = byId.get(a), refund = byId.get(b);
			if (!purchase || !refund) continue;
			refund.refundOf = purchase;
			purchase.refunds.push(refund);
		}
	}

	// Reloads after `make dev` replaces the file, then calls onChange.
	watch(onChange: () => void): void {
		this.close();
		const file = this.file;
		if (!file || !existsSync(dirname(file))) return;
		const reload = debounce(async () => { await this.load(); onChange(); }, 500, true);
		this.watcher = watch(dirname(file), (_, name) => { if (name === basename(file)) reload(); });
	}

	// Stops watching.
	close(): void {
		this.watcher?.close();
		this.watcher = null;
	}
}

// Every table the dev dashboard needs, in one go.
async function readAll(file: string) {
	const get = <T>(text: string) => query<T>(file, text);
	const [trans, categories, people, accounts, recipients, patterns, subscriptions, autoTags, handTags, debts, transfers, refunds] = await Promise.all([
		get<TransRow>(`SELECT t.id, t.date, a.name AS account, t.description, t.amount, a.currency, ${CATEGORY('c', 'p')},
			COALESCE(p.kind, c.kind) AS kind, pe.name AS person, r.name AS recipient, o.name AS other, res.why, s.name AS subscription, n.text AS note
			FROM Trans t JOIN Account a ON a.id = t.account_id
			LEFT JOIN Result res ON res.transaction_id = t.id
			LEFT JOIN Category c ON c.id = res.category_id LEFT JOIN Category p ON p.id = c.parent_id
			LEFT JOIN Person pe ON pe.id = res.person_id LEFT JOIN Recipient r ON r.id = res.recipient_id LEFT JOIN Account o ON o.id = res.account_id
			LEFT JOIN SubscriptionPayment sp ON sp.transaction_id = t.id AND sp.status <> 'rejected' LEFT JOIN Subscription s ON s.id = sp.subscription_id
			LEFT JOIN Note n ON n.transaction_id = t.id
			ORDER BY t.date, t.rowid`), // statement order within a day
		get<CategoryRow>('SELECT c.name, c.kind, c.color, c.icon, p.name AS parent FROM Category c LEFT JOIN Category p ON p.id = c.parent_id ORDER BY c.position, c.id'),
		get<{ name: string }>('SELECT name FROM Person ORDER BY name'),
		get<{ name: string }>('SELECT name FROM Account ORDER BY position, id'),
		get<RecipientRow>(`SELECT r.name, ${CATEGORY('c', 'p')} FROM Recipient r LEFT JOIN Category c ON c.id = r.category_id LEFT JOIN Category p ON p.id = c.parent_id ORDER BY r.name`),
		get<Named>('SELECT p.text AS name, r.name AS owner FROM Pattern p JOIN Recipient r ON r.id = p.recipient_id ORDER BY p.id'),
		get<SubscriptionRow>(`SELECT s.id, s.name, r.name AS recipient, s.amount, s.period, s.instalments_no, s.paid_before, s.last_date
			FROM Subscription s LEFT JOIN Recipient r ON r.id = s.recipient_id ORDER BY s.name`),
		get<Named>(`SELECT tg.name, COALESCE('r:' || r.name, 's:' || s.name) AS owner FROM AutoTag at JOIN Tag tg ON tg.id = at.tag_id
			LEFT JOIN Recipient r ON r.id = at.recipient_id LEFT JOIN Subscription s ON s.id = at.subscription_id`),
		get<Named>('SELECT tg.name, tt.transaction_id AS owner FROM TransactionTag tt JOIN Tag tg ON tg.id = tt.tag_id'),
		get<DebtRow>('SELECT d.id, pe.name AS person, d.date, d.amount, d.note, d.reason, d.transaction_id FROM Debt d JOIN Person pe ON pe.id = d.person_id ORDER BY d.date, d.id'),
		get<Pair>("SELECT out_id AS a, in_id AS b FROM Transfer WHERE status <> 'rejected'"),
		get<Pair>("SELECT purchase_id AS a, refund_id AS b FROM Refund WHERE status <> 'rejected'"),
	]);
	return { trans, categories, people, accounts, recipients, patterns, subscriptions, autoTags, handTags, debts, transfers, refunds };
}
