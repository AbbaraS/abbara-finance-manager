import type { FinanceSettings } from '../models/FinanceSettings';
import type { Transaction } from '../models/Transaction';

// Everything a dashboard section needs to draw itself.
export interface DashboardContext {
	rows: Transaction[];          // all rows, every month, categorised
	months: string[];             // months with data, oldest first
	month: string;                // the month being shown, "YYYY-MM"
	settings: FinanceSettings;
	expanded: Set<string>;        // open category rows, kept across redraws
	selectMonth: (month: string) => void; // switch month and redraw
	reload: () => void;                   // re-read the CSVs
	editCategory: (picked: Transaction[], similar: boolean) => void; // opens the category picker
}
