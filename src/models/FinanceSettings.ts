// Saved plugin settings (data.json). Your categories and labels live in the vault instead, see Labels.ts.
export interface FinanceSettings {
	dataFolder: string;       // vault folder holding the monthly CSVs
	labelsFile: string;       // vault path of your labels (JSON)
	currency: string;         // only rows in this currency are counted
	locale: string;           // number and month format, e.g. "en-GB"
	hiddenSections: string[]; // dashboard section ids not drawn
}
