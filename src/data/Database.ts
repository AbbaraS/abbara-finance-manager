import { execFile } from 'child_process';
import { existsSync, statSync, watch, type FSWatcher } from 'fs';
import { homedir } from 'os';
import { basename, dirname, join, resolve } from 'path';
import { debounce, FileSystemAdapter, Notice, type App } from 'obsidian';
import { copyDefaultLabels } from '../defaults/defaultLabels';
import type { Labels } from '../models/Labels';
import type { Transaction } from '../models/Transaction';
import { run, sql } from './sqlite';
import { fillIds, labelStatements, readTables, readVersion, type TransferLink } from './tables';

// Database version this plugin understands (PRAGMA user_version, set by myFinances db.py).
export const DB_VERSION = 1;

// Your finance database (data/finance.db in myFinances). Python fills the statements and works out every row
// (build.py); here you edit your lists and decisions. After each save the rules run again (build.py --rules).
export class Database {
	labels: Labels = copyDefaultLabels();
	rows: Transaction[] = [];   // worked out by Python, oldest first
	links: TransferLink[] = []; // every transfer pair, also ones you unlinked
	error = '';                 // why the file can't be used; nothing is written while set
	private queue: Promise<void> = Promise.resolve(); // saves, one after another
	private writing = 0;        // saves running now; the watcher waits for them
	private ownWrite = 0;       // file time after our last save, so the watcher skips it
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
			if (version !== DB_VERSION) throw new Error(`it's version ${version}, this plugin uses ${DB_VERSION}. Run make in myFinances`);
			const t = await readTables(file);
			this.labels = t.labels;
			this.rows = t.rows;
			this.links = t.links;
			this.error = '';
		} catch (e) {
			const error = `Finance: can't use the database: ${(e as Error).message}.`;
			if (error !== this.error) new Notice(error, 0);
			this.error = error;
			this.labels = copyDefaultLabels();
			this.rows = [];
			this.links = [];
		}
	}

	// Writes your lists and decisions, runs the rules, then reads the rows again (your lists stay the same objects).
	save(): Promise<void> {
		return this.write(labelStatements(this.labels));
	}

	// Links two rows as one transfer, or unlinks them, then runs the rules.
	editTransfer(action: 'link' | 'unlink', out: Transaction, into: Transaction): Promise<void> {
		const [o, i] = [sql(out.id), sql(into.id)];
		return this.write(action === 'link' ? [
			`DELETE FROM Transfer WHERE status <> 'rejected' AND (out_id IN (${o}, ${i}) OR in_id IN (${o}, ${i}));`, // their old pairs
			`INSERT INTO Transfer (out_id, in_id, status) VALUES (${o}, ${i}, 'confirmed') ON CONFLICT (out_id, in_id) DO UPDATE SET status = 'confirmed';`,
		] : [
			`INSERT INTO Transfer (out_id, in_id, status) VALUES (${o}, ${i}, 'rejected') ON CONFLICT (out_id, in_id) DO UPDATE SET status = 'rejected';`,
		]);
	}

	// Runs SQL, then the rules, then reads the rows again. One save at a time.
	private write(statements: string[]): Promise<void> {
		this.queue = this.queue.then(async () => {
			if (this.error) return void new Notice('Finance: not saved, the database can\'t be used.');
			const file = this.file;
			this.writing++;
			try {
				await run(file, statements);
				await runRules(file);
				const t = await readTables(file);
				fillIds(this.labels, t.labels);
				this.rows = t.rows;
				this.links = t.links;
				this.ownWrite = statSync(file).mtimeMs;
			} catch (e) {
				new Notice(`Finance: not saved: ${(e as Error).message}`, 0);
			} finally {
				this.writing--;
			}
		});
		return this.queue;
	}

	// Reloads when another program (make in myFinances, a SQLite app) changes the file, then calls onChange.
	watch(onChange: () => void): void {
		this.close();
		const file = this.file;
		if (!file || !existsSync(dirname(file))) return;
		const reload = debounce(async () => { await this.load(); onChange(); }, 500, true);
		this.watcher = watch(dirname(file), (_, name) => {
			if (name !== basename(file) || this.writing > 0) return;
			if (existsSync(file) && statSync(file).mtimeMs === this.ownWrite) return; // our own save
			reload();
		});
	}

	// Stops watching.
	close(): void {
		this.watcher?.close();
		this.watcher = null;
	}
}

// Runs myFinances' rules on the file: python -m finances.build --rules, from the project the file is in (<project>/data/finance.db).
function runRules(file: string): Promise<void> {
	const root = dirname(dirname(file));
	const python = join(root, '.venv', 'bin', 'python');
	if (!existsSync(python)) return Promise.reject(new Error(`no Python at ${python}. Run make in myFinances once`));
	return new Promise((resolve, reject) => {
		execFile(python, ['-m', 'finances.build', '--rules', '--db', file], { cwd: root, env: { ...process.env, FINANCES_RUN: 'obsidian' }, maxBuffer: 16 * 1024 * 1024 },
			(err, _out, errText) => (err ? reject(new Error(errText.trim().split('\n').pop() || err.message)) : resolve()));
	});
}
