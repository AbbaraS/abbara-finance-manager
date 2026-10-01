import type { App } from 'obsidian';
import type { FinanceSettings } from '../models/FinanceSettings';
import type { Label, Labels } from '../models/Labels';
import type { Transaction } from '../models/Transaction';

// Everything a dashboard section needs to draw itself.
export interface DashboardContext {
	app: App;
	rows: Transaction[];          // all rows, every month, categorised
	months: string[];             // months with data, oldest first
	month: string;                // the month being shown, "YYYY-MM"
	settings: FinanceSettings;
	labels: Labels;               // your categories, accounts and labels
	accounts: string[];           // accounts in the data + ones you added
	expanded: Set<string>;        // open rows, kept across redraws
	selectMonth: (month: string) => void; // switch month and redraw
	reload: () => void;                   // re-read the database
	redraw: () => void;                   // redraw without saving
	editCategory: (picked: Transaction[], similar: boolean, newSubscription?: boolean) => void; // opens the edit window
	save: () => void;                                                // saves your labels and redraws
	saveLabel: (t: Transaction, patch: Label) => void;               // changes one label, saves and redraws
}
