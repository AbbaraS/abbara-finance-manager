import { execFile, spawn } from 'child_process';

// Talks to the sqlite3 program that comes with macOS. It uses SQLite's own file locking,
// so Python and Obsidian can both write to the database safely.

// Biggest query output accepted, in bytes.
const MAX_OUTPUT = 256 * 1024 * 1024;

// Runs one SELECT and returns its rows as objects.
export function query<T>(file: string, text: string): Promise<T[]> {
	return new Promise((resolve, reject) => {
		execFile('sqlite3', ['-json', '-cmd', '.timeout 5000', file, text], { maxBuffer: MAX_OUTPUT }, (err, out, errText) => {
			if (err) reject(new Error(errText.trim() || err.message));
			else resolve(out.trim() ? JSON.parse(out) : []);
		});
	});
}

// Runs the statements as one transaction: all of them happen, or none if one fails.
export function run(file: string, statements: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn('sqlite3', ['-bail', '-cmd', '.timeout 5000', file]);
		let errText = '';
		p.stderr.on('data', (d) => (errText += d));
		p.stdin.on('error', () => {}); // sqlite3 stopped early; the reason comes from stderr
		p.on('error', reject); // sqlite3 not found
		p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(errText.trim() || `sqlite3 stopped (${code})`))));
		p.stdin.end(['PRAGMA foreign_keys = ON;', 'BEGIN;', ...statements, 'COMMIT;', ''].join('\n'));
	});
}

// A value written into SQL: text in quotes, numbers as they are, anything else NULL.
export function sql(v: string | number | null | undefined): string {
	if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
	if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
	return 'NULL';
}
