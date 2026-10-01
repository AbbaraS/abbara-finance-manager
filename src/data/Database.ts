import { existsSync, statSync, watch, type FSWatcher } from 'fs';
import { homedir } from 'os';
import { basename, dirname, resolve } from 'path';
import { debounce, FileSystemAdapter, Notice, type App } from 'obsidian';
import { copyDefaultLabels } from '../defaults/defaultLabels';
import { syncLists } from '../models/categories';
import { categorise } from '../models/categorise';
import type { Labels } from '../models/Labels';
import type { Transaction } from '../models/Transaction';
import { run } from './sqlite';
import { labelStatements, readIds, readTables, readVersion, resultKey, resultStatement } from './tables';

// Database version this plugin understands (PRAGMA user_version, set by myFinances db.py).
export const DB_VERSION = 7;

// Your finance database (SQLite, made by myFinances): transactions come from Python, your labels from here.
export class Database {
	labels: Labels = copyDefaultLabels();
	rows: Transaction[] = []; // every transaction, not yet categorised
	error = '';               // why the file can't be used; nothing is written while set
	private saved = new Map<string, string>(); // transaction id -> worked-out category as saved (resultKey)
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
			const version = await readVersion(file);
			if (version !== DB_VERSION) throw new Error(`it's version ${version}, this plugin uses ${DB_VERSION}. Run make in myFinances to upgrade it`);
			const tables = await readTables(file);
			this.labels = tables.labels;
			this.rows = tables.rows;
			this.saved = tables.saved;
			this.error = '';
		} catch (e) {
			const error = `Finance: can't use the database: ${(e as Error).message}.`;
			if (error !== this.error) new Notice(error, 0);
			this.error = error;
			this.labels = copyDefaultLabels();
			this.rows = [];
			return;
		}

		// A new database starts with the default categories, subcategories and counterparties; otherwise save only what changed (new rows).
		if (this.labels.categories.length > 0) return this.save(false);
		const { categories, subcategories, counterparties } = copyDefaultLabels();
		this.labels = { ...this.labels, categories, subcategories, counterparties };
		await this.save();
	}

	// Writes your labels, then each row's worked-out category where it changed. With `always` off, only when something did.
	async save(always = true): Promise<void> {
		if (this.error) return void (always && new Notice('Finance: not saved, the database can\'t be used.'));
		const done = categorise(this.rows, this.labels);
		const listed = syncLists(this.labels, done); // subcategories and people in use get rows too
		const changed = new Map<string, string>();
		const results: string[] = [];
		for (const t of done) {
			const key = resultKey(t);
			if (this.saved.get(t.id) === key) continue;
			changed.set(t.id, key);
			results.push(resultStatement(t));
		}
		if (!always && !listed && results.length === 0) return;

		this.writing++;
		try {
			await run(this.file, [...labelStatements(this.labels), ...results]);
			this.ownWrite = statSync(this.file).mtimeMs;
			changed.forEach((key, id) => this.saved.set(id, key));
			await readIds(this.file, this.labels);
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
