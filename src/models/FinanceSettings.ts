// Saved plugin settings.
export interface FinanceSettings {
	dataFolder: string;         // vault folder holding the monthly CSVs
	currency: string;           // only rows in this currency are counted
	locale: string;             // number and month format, e.g. "en-GB"
	incomeCategories: string[]; // positive rows here count as income
	ignoreCategories: string[]; // left out of every total
}
