import { existsSync, statSync, watch, type FSWatcher } from 'fs';
import { homedir } from 'os';
import { basename, dirname, resolve } from 'path';
import { debounce, FileSystemAdapter, Notice, type App } from 'obsidian';
import { copyDefaultLabels } from '../defaults/defaultLabels';
import { categorise } from '../models/categorise';
import type { CategoryKind } from '../models/Category';
import { setLabel, type Account, type Labels } from '../models/Labels';
import type { Direction } from '../models/Rule';
import { UNCATEGORISED } from '../models/rowKind';
import type { Transaction } from '../models/Transaction';
import { monthOf } from '../utils/dates';
import { query, run, sql } from './sqlite';

// Database version this plugin understands (PRAGMA user_version, set by myFinances db.py).
export const DB_VERSION = 1;

// Rows as sqlite3 returns them.
interface CategoryRow { id: number; name: string; kind: CategoryKind; color: string; icon: string }
interface RuleRow { patterns: string; category: string; subcategory: string | null; account: string | null; direction: Direction }
interface LabelRow { id: string; category: string | null; sub: string | null; note: string | null; tags: string | null; other: string | null }
interface TransactionRow {
	id: string; date: string; account: string; description: string; amount: number; currency: string;
	category: string | null; sub: string | null; category_by: string | null; // as last worked out
}

// SQL that finds a category's or account's id by name (NULL for none).
const categoryId = (name?: string) => `(SELECT id FROM categories WHERE name = ${sql(name || null)})`;
const accountId = (name?: string) => `(SELECT id FROM accounts WHERE name = ${sql(name || null)})`;

// Your finance database (SQLite, made by myFinances): transactions come from Python, your labels from here.
export class Database {
	labels: Labels = copyDefaultLabels();
	rows: Transaction[] = []; // every transaction, not yet categorised
	error = '';               // why the file can't be used; nothing is written while set
	private saved = new Map<string, string>(); // transaction id -> "category|subcategory|by" in the file
	private ownWrite = 0;     // file time after our last write, so the watcher skips our own changes
	private writing = 0;      // writes running now
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
		const file = this.file;
		try {
			if (!file) throw new Error('set the database file in settings');
			if (!existsSync(file)) throw new Error(`there's no file at ${file}. Run make in myFinances`);
			const get = <T>(text: string) => query<T>(file, text);
			const [version, categories, accounts, rules, labels, rows] = await Promise.all([
				get<{ user_version: number }>('PRAGMA user_version'),
				get<CategoryRow>('SELECT id, name, kind, color, icon FROM categories ORDER BY position, id'),
				get<Account>("SELECT name, match FROM accounts WHERE match <> '' OR bank IS NULL ORDER BY name"),
				get<RuleRow>(`SELECT r.patterns, c.name AS category, r.subcategory, a.name AS account, r.direction FROM rules r
					JOIN categories c ON c.id = r.category_id LEFT JOIN accounts a ON a.id = r.account_id ORDER BY r.position, r.id`),
				get<LabelRow>(`SELECT l.transaction_id AS id, c.name AS category, l.subcategory AS sub, l.note, l.tags, a.name AS other
					FROM labels l LEFT JOIN categories c ON c.id = l.category_id LEFT JOIN accounts a ON a.id = l.other_account_id`),
				get<TransactionRow>(`SELECT t.id, t.date, a.name AS account, t.description, t.amount, t.currency,
					c.name AS category, t.subcategory AS sub, t.category_by FROM transactions t
					JOIN accounts a ON a.id = t.account_id LEFT JOIN categories c ON c.id = t.category_id ORDER BY t.date, t.rowid`), // statement order within a day
			]);
			const v = version[0]?.user_version;
			if (v !== DB_VERSION) throw new Error(`it's version ${v}, this plugin uses ${DB_VERSION}`);

			this.labels = {
				categories,
				accounts,
				rules: rules.map((r) => ({
					patterns: JSON.parse(r.patterns), category: r.category, subcategory: r.subcategory ?? '',
					account: r.account ?? '', direction: r.direction,
				})),
				transactions: {},
			};
			for (const l of labels) {
				setLabel(this.labels, l.id, { category: l.category ?? '', sub: l.sub ?? '', note: l.note ?? '', tags: l.tags ? JSON.parse(l.tags) : [], other: l.other ?? '' });
			}
			this.rows = rows.map((t) => ({
				id: t.id, date: t.date, month: monthOf(t.date), day: Number(t.date.slice(8, 10)), account: t.account,
				description: t.description, amount: t.amount, currency: t.currency.toUpperCase(),
				category: UNCATEGORISED, kind: null, source: 'none', subcategory: '', note: '', tags: [],
				otherAccount: '', foundAccount: '', partner: null,
			}));
			this.saved = new Map(rows.map((t) => [t.id, [t.category ?? '', t.sub ?? '', t.category_by ?? ''].join('|')]));
			this.error = '';
		} catch (e) {
			const error = `Finance: can't use the database: ${(e as Error).message}.`;
			if (error !== this.error) new Notice(error, 0);
			this.error = error;
			this.labels = copyDefaultLabels();
			this.rows = [];
			return;
		}

		// A new database starts with the default categories and merchants.
		if (this.labels.categories.length > 0) return this.write([]); // new rows' categories only
		const { categories, rules } = copyDefaultLabels();
		this.labels = { ...this.labels, categories, rules };
		await this.save();
	}

	// Writes your categories, accounts, merchants and labels, then each row's worked-out category.
	async save(): Promise<void> {
		const { categories, accounts, rules, transactions } = this.labels;
		const listed = accounts.map((a) => a.name);
		const named = [...new Set([...listed, ...rules.map((r) => r.account), ...Object.values(transactions).map((l) => l.other ?? '')])].filter(Boolean);
		const ids = categories.flatMap((c) => (c.id ? [c.id] : []));
		await this.write([
			// Categories: removed ones first, so a new or renamed one can take a freed name.
			`DELETE FROM categories WHERE id NOT IN (${ids.join(', ')});`,
			...categories.map((c, i) => `INSERT INTO categories (id, name, kind, color, icon, position)
				VALUES (${sql(c.id)}, ${sql(c.name)}, ${sql(c.kind)}, ${sql(c.color)}, ${sql(c.icon)}, ${i})
				ON CONFLICT (id) DO UPDATE SET name = excluded.name, kind = excluded.kind, color = excluded.color, icon = excluded.icon, position = excluded.position;`),
			// Accounts: every named one exists, match text as set; ones you removed (no bank, unused) go.
			...named.map((n) => `INSERT OR IGNORE INTO accounts (name) VALUES (${sql(n)});`),
			`UPDATE accounts SET match = '';`,
			...accounts.map((a) => `UPDATE accounts SET match = ${sql(a.match)} WHERE name = ${sql(a.name)};`),
			`DELETE FROM accounts WHERE bank IS NULL AND name NOT IN (${named.map(sql).join(', ')}) AND id NOT IN (SELECT account_id FROM transactions);`,
			// Merchants in order, then labels.
			'DELETE FROM rules;',
			...rules.map((r, i) => `INSERT INTO rules (position, patterns, category_id, subcategory, account_id, direction)
				SELECT ${i}, ${sql(JSON.stringify(r.patterns))}, id, ${sql(r.subcategory || null)}, ${accountId(r.account)}, ${sql(r.direction)}
				FROM categories WHERE name = ${sql(r.category)};`),
			'DELETE FROM labels;',
			...Object.entries(transactions).map(([id, l]) => `INSERT INTO labels (transaction_id, category_id, subcategory, note, tags, other_account_id)
				VALUES (${sql(id)}, ${categoryId(l.category)}, ${sql(l.sub || null)}, ${sql(l.note || null)},
				${sql(l.tags?.length ? JSON.stringify(l.tags) : null)}, ${accountId(l.other)});`),
		]);

		// New categories get their ids.
		const fresh = categories.filter((c) => !c.id);
		if (fresh.length === 0 || this.error) return;
		const saved = await query<{ id: number; name: string }>(this.file, 'SELECT id, name FROM categories');
		for (const c of fresh) c.id = saved.find((s) => s.name === c.name)?.id;
	}

	// Runs the statements plus an update for each row whose worked-out category changed, as one transaction.
	private async write(statements: string[]): Promise<void> {
		if (this.error) return void new Notice('Finance: not saved, the database can\'t be used.');
		const changed = new Map<string, string>();
		for (const t of categorise(this.rows, this.labels)) {
			const category = t.kind ? t.category : '';
			const by = t.source === 'none' ? '' : t.source;
			const key = [category, t.subcategory, by].join('|');
			if (this.saved.get(t.id) === key) continue;
			changed.set(t.id, key);
			statements.push(`UPDATE transactions SET category_id = ${categoryId(category)}, subcategory = ${sql(t.subcategory || null)},
				category_by = ${sql(by || null)} WHERE id = ${sql(t.id)};`);
		}
		if (statements.length === 0) return;

		this.writing++;
		try {
			await run(this.file, statements);
			this.ownWrite = statSync(this.file).mtimeMs;
			changed.forEach((key, id) => this.saved.set(id, key));
		} catch (e) {
			new Notice(`Finance: not saved: ${(e as Error).message}`, 0);
		} finally {
			this.writing--;
		}
	}

	// Reloads when another program (myFinances, a SQLite app) changes the file, then calls onChange.
	watch(onChange: () => void): void {
		this.close();
		const file = this.file;
		if (!file || !existsSync(dirname(file))) return;
		const reload = debounce(async () => { await this.load(); onChange(); }, 500, true);
		this.watcher = watch(dirname(file), (_, name) => {
			if (name !== basename(file) || this.writing > 0) return;
			if (existsSync(file) && statSync(file).mtimeMs === this.ownWrite) return; // our own write
			reload();
		});
	}

	// Stops watching.
	close(): void {
		this.watcher?.close();
		this.watcher = null;
	}
}
