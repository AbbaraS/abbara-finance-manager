import { normalizePath, type App, type TFile } from 'obsidian';
import type { Transaction } from '../models/Transaction';
import { toTransactions } from './toTransactions';
import { addKeys } from './transactionKeys';

// CSV files inside the data folder (any depth).
export function dataFiles(app: App, folder: string): TFile[] {
	const prefix = normalizePath(folder) + '/';
	return app.vault.getFiles().filter((f) => f.extension === 'csv' && f.path.startsWith(prefix));
}

// Reads every CSV in the data folder, oldest first, with stable keys.
export async function loadTransactions(app: App, folder: string): Promise<Transaction[]> {
	const files = dataFiles(app, folder);
	const parts = await Promise.all(files.map(async (f) => toTransactions(await app.vault.read(f))));
	const rows = parts.flat().sort((a, b) => a.date.localeCompare(b.date));
	addKeys(rows);
	return rows;
}
