import { ItemView, Notice, type WorkspaceLeaf } from 'obsidian';
import { CategoryModal } from '../edit/CategoryModal';
import { DebtModal } from '../edit/DebtModal';
import type FinancePlugin from '../main';
import { accountNames } from '../models/accountNames';
import { categorise } from '../models/categorise';
import { setLabel } from '../models/Labels';
import { monthList } from '../models/monthList';
import { orderedSections } from '../models/sections';
import type { DashboardContext } from './DashboardContext';
import { SECTION_DRAWERS } from './sectionDrawers';
import { emptyState } from './sections/emptyState';
import { header } from './sections/header';
import { section } from './sections/section';

export const VIEW_TYPE = 'afm-dashboard';
export const DEV_VIEW_TYPE = 'afm-dev-dashboard';

// Shown when you try to change something in the dev dashboard.
const READ_ONLY = 'The dev dashboard is read only: change data/dev-seed.sql in myFinances and run make dev.';

// The dashboard tab: holds the data and chosen month, and lays out the sections.
// `dev` shows the dev database instead: rows already worked out by Python, nothing saved.
export class DashboardView extends ItemView {
	private month = '';
	private expanded = new Set<string>();

	constructor(leaf: WorkspaceLeaf, private plugin: FinancePlugin, private dev = false) {
		super(leaf);
	}

	getViewType() { return this.dev ? DEV_VIEW_TYPE : VIEW_TYPE; }
	getDisplayText() { return this.dev ? 'Finance dashboard (dev)' : 'Finance dashboard'; }
	getIcon() { return this.dev ? 'flask-conical' : 'wallet'; }

	async onOpen() { this.render(); }

	// Redraws every visible section. Keeps the scroll position.
	render() {
		const el = this.contentEl;
		const scroll = el.scrollTop;
		el.empty();
		el.addClass('afm-view');

		const { settings: s, db, devDb } = this.plugin;
		const labels = this.dev ? devDb.labels : db.labels;
		const rows = this.dev ? devDb.rows : categorise(db.rows, labels);
		const months = monthList(rows);
		if (months.length === 0) return emptyState(el, this.dev ? devDb : db, this.dev);
		if (!months.includes(this.month)) this.month = months[months.length - 1];

		const readOnly = () => new Notice(READ_ONLY);
		const ctx: DashboardContext = {
			app: this.app, title: this.dev ? 'Finances (dev)' : 'Finances',
			rows, months, month: this.month, settings: s, labels, accounts: accountNames(rows, labels.accounts), expanded: this.expanded,
			selectMonth: (m) => { this.month = m; this.render(); },
			reload: () => void (this.dev ? this.plugin.openDevDatabase() : this.plugin.openDatabase()),
			redraw: () => this.render(),
			editCategory: (picked, similar, newSub) => this.dev ? readOnly() : new CategoryModal(this.app, this.plugin, rows, picked, similar, newSub).open(),
			editDebt: (debt, person) => this.dev ? readOnly() : new DebtModal(this.app, this.plugin, debt, person).open(),
			save: () => this.dev ? readOnly() : void this.plugin.save(),
			saveSettings: () => void this.plugin.saveSettings(),
			saveLabel: (t, patch) => { if (this.dev) return void readOnly(); setLabel(labels, t.id, patch); void this.plugin.save(); },
		};

		header(el, ctx);
		const shown = orderedSections(s.sectionOrder).filter((x) => !s.hiddenSections.includes(x.id));
		if (shown.length === 0) el.createDiv({ cls: 'afm-note', text: 'All sections are hidden. Turn them on in settings.' });
		for (const x of shown) {
			const body = section(el, x, ctx);
			if (body) SECTION_DRAWERS[x.id](body, ctx);
		}
		el.scrollTop = scroll;
	}
}
