import { normalizePath, type App, type TFile } from 'obsidian';
import type { Transaction } from '../models/Transaction';
import { toTransactions } from './toTransactions';
import { addKeys } from './transactionKeys';

// Monthly CSVs (named like 2026-01.csv) inside the data folder, any depth. Other CSVs (overall.csv...) are skipped.
export function dataFiles(app: App, folder: string): TFile[] {
	const prefix = normalizePath(folder) + '/';
	return app.vault.getFiles().filter((f) => /^\d{4}-\d{2}\.csv$/.test(f.name) && f.path.startsWith(prefix));
}

// Reads every CSV in the data folder, oldest first, with stable keys.
export async function loadTransactions(app: App, folder: string): Promise<Transaction[]> {
	const files = dataFiles(app, folder);
	const parts = await Promise.all(files.map(async (f) => toTransactions(await app.vault.read(f))));
	const rows = parts.flat().sort((a, b) => a.date.localeCompare(b.date));
	addKeys(rows);
	return rows;
}
