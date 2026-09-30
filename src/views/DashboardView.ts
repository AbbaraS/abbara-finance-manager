import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { CategoryModal } from '../edit/CategoryModal';
import type FinancePlugin from '../main';
import { accountNames } from '../models/accountNames';
import { categorise } from '../models/categorise';
import { setLabel } from '../models/Labels';
import { monthList } from '../models/monthList';
import { SECTIONS } from '../models/sections';
import type { Transaction } from '../models/Transaction';
import type { DashboardContext } from './DashboardContext';
import { SECTION_DRAWERS } from './sectionDrawers';
import { emptyState } from './sections/emptyState';
import { header } from './sections/header';

export const VIEW_TYPE = 'afm-dashboard';

// The dashboard tab: holds the data and chosen month, and lays out the sections.
export class DashboardView extends ItemView {
	private raw: Transaction[] = [];
	private month = '';
	private expanded = new Set<string>();

	constructor(leaf: WorkspaceLeaf, private plugin: FinancePlugin) {
		super(leaf);
	}

	getViewType() { return VIEW_TYPE; }
	getDisplayText() { return 'Finance dashboard'; }
	getIcon() { return 'wallet'; }

	async onOpen() { await this.reload(); }

	// Gets rows from the cache (reads the CSVs if needed), then redraws.
	async reload() {
		this.raw = await this.plugin.cache.get(this.plugin.settings.dataFolder);
		this.render();
	}

	// Redraws every visible section. Keeps the scroll position.
	render() {
		const el = this.contentEl;
		const scroll = el.scrollTop;
		el.empty();
		el.addClass('afm-view');

		const s = this.plugin.settings;
		const labels = this.plugin.labels.data;
		const rows = categorise(this.raw, labels);
		const months = monthList(rows);
		if (months.length === 0) return emptyState(el, this.plugin);
		if (!months.includes(this.month)) this.month = months[months.length - 1];

		const ctx: DashboardContext = {
			rows, months, month: this.month, settings: s, labels, accounts: accountNames(rows, labels.accounts), expanded: this.expanded,
			selectMonth: (m) => { this.month = m; this.render(); },
			reload: () => { this.plugin.cache.clear(); void this.reload(); },
			editCategory: (picked, similar) => new CategoryModal(this.app, this.plugin, rows, picked, similar).open(),
			saveLabel: (t, patch) => { setLabel(labels, t.id, patch); void this.plugin.save(); },
		};

		header(el, ctx);
		const shown = SECTIONS.filter((x) => !s.hiddenSections.includes(x.id));
		if (shown.length === 0) el.createDiv({ cls: 'afm-note', text: 'All sections are hidden. Turn them on in settings.' });
		for (const x of shown) SECTION_DRAWERS[x.id](el, ctx);
		el.scrollTop = scroll;
	}
}
