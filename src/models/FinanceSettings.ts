// Saved plugin settings (data.json). Your labels live in the vault instead, see Labels.ts.
export interface FinanceSettings {
	version: number;          // 3 = labels moved to labelsFile (see migrateOldData)
	dataFolder: string;       // vault folder holding the monthly CSVs
	labelsFile: string;       // vault path of your labels (JSON)
	currency: string;         // only rows in this currency are counted
	locale: string;           // number and month format, e.g. "en-GB"
	incomeAccounts: string[]; // uncategorised money in on these counts as income
	hiddenSections: string[]; // dashboard section ids not drawn
}
