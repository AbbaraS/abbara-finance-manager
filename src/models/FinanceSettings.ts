import type { Category } from './Category';
import type { Rule } from './Rule';

// Saved plugin settings.
export interface FinanceSettings {
	dataFolder: string;             // vault folder holding the monthly CSVs
	currency: string;               // only rows in this currency are counted
	locale: string;                 // number and month format, e.g. "en-GB"
	incomeAccounts: string[];       // only money in on these can be income
	categories: Category[];
	rules: Rule[];                  // first match wins
	edits: Record<string, string>;  // transaction key -> category; beats rules
	hiddenSections: string[];       // dashboard section ids not drawn
}
