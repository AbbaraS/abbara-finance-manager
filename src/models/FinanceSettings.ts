import type { Category } from './Category';
import type { Rule } from './Rule';
import type { TransactionDetails } from './TransactionDetails';

// Saved plugin settings.
export interface FinanceSettings {
	version: number;                // bumped when saved data needs upgrading (migrateSettings)
	dataFolder: string;             // vault folder holding the monthly CSVs
	currency: string;               // only rows in this currency are counted
	locale: string;                 // number and month format, e.g. "en-GB"
	incomeAccounts: string[];       // only money in on these can be income
	categories: Category[];
	rules: Rule[];                  // first match wins
	edits: Record<string, string>;  // transaction key -> category; beats rules
	details: Record<string, TransactionDetails>; // transaction key -> subcategory, note...
	hiddenSections: string[];       // dashboard section ids not drawn
}
