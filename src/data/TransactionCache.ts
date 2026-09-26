import type { App } from 'obsidian';
import type { Transaction } from '../models/Transaction';
import { loadTransactions } from './loadTransactions';

// Raw rows, read once and reused until the files or the folder change.
export class TransactionCache {
	private rows: Transaction[] | null = null;
	private folder = '';

	constructor(private app: App) {}

	// Rows for `folder`, reading the CSVs only when needed.
	async get(folder: string): Promise<Transaction[]> {
		if (!this.rows || this.folder !== folder) {
			this.rows = await loadTransactions(this.app, folder);
			this.folder = folder;
		}
		return this.rows;
	}

	// Forces the next get() to read the files again.
	clear(): void {
		this.rows = null;
	}
}
