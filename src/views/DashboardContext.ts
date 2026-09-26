import type { FinanceSettings } from '../models/FinanceSettings';
import type { Transaction } from '../models/Transaction';

// Everything a dashboard section needs to draw itself.
export interface DashboardContext {
	rows: Transaction[];          // all loaded rows, every month
	months: string[];             // months with data, oldest first
	month: string;                // the month being shown, "YYYY-MM"
	settings: FinanceSettings;
	selectMonth: (month: string) => void; // switch month and redraw
	reload: () => void;                   // re-read the CSVs
}
