// Saved plugin settings (data.json). Your categories and labels live in the database instead, see data/Database.ts.
export interface FinanceSettings {
	dbFile: string;               // finance.db made by myFinances: full path, "~/..." or a path inside the vault
	currency: string;             // only rows in this currency are counted
	locale: string;               // number and month format, e.g. "en-GB"
	hiddenSections: string[];     // dashboard section ids not drawn
	sectionOrder: string[];       // dashboard section ids in page order, [] = default
	collapsedSections: string[];  // dashboard section ids showing only their title
	shownCounterparties: string[]; // counterparty names in "Spending by counterparty"
	hiddenRepeats: string[];      // "Look like subscriptions" you said aren't, as "TEXT|amount"
}
