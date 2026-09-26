import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { loadTransactions } from '../data/loadTransactions';
import type FinancePlugin from '../main';
import { monthList } from '../models/monthList';
import type { Transaction } from '../models/Transaction';
import type { DashboardContext } from './DashboardContext';
import { accountTable } from './sections/accountTable';
import { categoryTable } from './sections/categoryTable';
import { comparison } from './sections/comparison';
import { dailyLine } from './sections/dailyLine';
import { emptyState } from './sections/emptyState';
import { header } from './sections/header';
import { monthlyBars } from './sections/monthlyBars';
import { summaryCards } from './sections/summaryCards';
import { uncategorisedList } from './sections/uncategorisedList';

export const VIEW_TYPE = 'afm-dashboard';

// The dashboard tab: holds the data and chosen month, and lays out the sections.
export class DashboardView extends ItemView {
	private rows: Transaction[] = [];
	private month = '';

	constructor(leaf: WorkspaceLeaf, private plugin: FinancePlugin) {
		super(leaf);
	}

	getViewType() { return VIEW_TYPE; }
	getDisplayText() { return 'Finance dashboard'; }
	getIcon() { return 'wallet'; }

	async onOpen() { await this.reload(); }

	// Reads the CSVs again, then redraws.
	async reload() {
		this.rows = await loadTransactions(this.app, this.plugin.settings.dataFolder);
		this.render();
	}

	// Redraws every section from the loaded rows (no file reads).
	render() {
		const el = this.contentEl;
		el.empty();
		el.addClass('afm-view');

		const months = monthList(this.rows);
		if (months.length === 0) return emptyState(el, this.plugin);
		if (!months.includes(this.month)) this.month = months[months.length - 1];

		const ctx: DashboardContext = {
			rows: this.rows, months, month: this.month, settings: this.plugin.settings,
			selectMonth: (m) => { this.month = m; this.render(); },
			reload: () => void this.reload(),
		};

		// Top.
		header(el, ctx);
		summaryCards(el, ctx);
		// Trends.
		monthlyBars(el, ctx);
		dailyLine(el, ctx);
		// Breakdowns.
		categoryTable(el, ctx);
		accountTable(el, ctx);
		comparison(el, ctx);
		uncategorisedList(el, ctx);
	}
}
