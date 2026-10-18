// Saved plugin settings (data.json). Your categories and labels live in the database instead, see data/Database.ts.
export interface FinanceSettings {
	dbFile: string;               // finance.db made by myFinances: full path, "~/..." or a path inside the vault
	currency: string;             // only rows in this currency are counted
	locale: string;               // number and month format, e.g. "en-GB"
	hiddenSections: string[];     // dashboard section ids not drawn
	sectionOrder: string[];       // dashboard section ids in page order, [] = default
	collapsedSections: string[];  // dashboard section ids showing only their title
	halfSections: string[];       // dashboard section ids half as wide, so two sit side by side
	sectionColumns: Record<string, 'left' | 'right'>; // half-width sections: which column; missing = alternate
	describedRecipients: string[]; // recipients whose rows keep the bank's description as their name (e.g. Apple.com: which app isn't known)
	subscriptionsOverall: boolean; // Subscriptions section: every payment (true) or up to the shown month
}
