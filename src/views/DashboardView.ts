import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { CategoryModal } from '../edit/CategoryModal';
import { DebtModal } from '../edit/DebtModal';
import type FinancePlugin from '../main';
import { accountNames } from '../models/accountNames';
import { setLabel } from '../models/Labels';
import { monthList } from '../models/monthList';
import { orderedSections } from '../models/sections';
import type { DashboardContext } from './DashboardContext';
import { SECTION_DRAWERS, SECTION_EMPTY } from './sectionDrawers';
import { emptyState } from './sections/emptyState';
import { header } from './sections/header';
import { columnDrop, section } from './sections/section';

export const VIEW_TYPE = 'afm-dashboard';

// The dashboard tab: holds the chosen month and lays out the sections. Rows are worked out by Python (myFinances);
// edits save to the database and the rules run again.
export class DashboardView extends ItemView {
	private month = '';
	private expanded = new Set<string>();

	constructor(leaf: WorkspaceLeaf, private plugin: FinancePlugin) {
		super(leaf);
	}

	getViewType() { return VIEW_TYPE; }
	getDisplayText() { return 'Finance dashboard'; }
	getIcon() { return 'wallet'; }

	async onOpen() { this.render(); }

	// Redraws every visible section. Keeps the scroll position.
	render() {
		const el = this.contentEl;
		const scroll = el.scrollTop;
		el.empty();
		el.addClass('afm-view');

		const { settings: s, db } = this.plugin;
		const { labels, rows } = db;
		const months = monthList(rows);
		if (months.length === 0) return emptyState(el, db);
		if (!months.includes(this.month)) this.month = months[months.length - 1];

		const ctx: DashboardContext = {
			app: this.app, title: 'Finances',
			rows, months, month: this.month, settings: s, labels, accounts: accountNames(rows, labels.accounts), expanded: this.expanded, columns: {},
			selectMonth: (m) => { this.month = m; this.render(); },
			reload: () => void this.plugin.openDatabase(),
			redraw: () => this.render(),
			editCategory: (picked, similar, newSub) => new CategoryModal(this.app, this.plugin, rows, picked, similar, newSub).open(),
			editDebt: (debt, person) => new DebtModal(this.app, this.plugin, debt, person).open(),
			save: () => void this.plugin.save(),
			saveSettings: () => void this.plugin.saveSettings(),
			saveLabel: (t, patch) => { setLabel(labels, t.id, patch); void this.plugin.save(); },
			links: db.links,
			editTransfer: (action, out, into) => void db.editTransfer(action, out, into).then(() => this.plugin.refreshViews()),
		};

		header(el, ctx);
		const shown = orderedSections(s.sectionOrder).filter((x) => !s.hiddenSections.includes(x.id) && !SECTION_EMPTY[x.id]?.(ctx));
		if (shown.length === 0) el.createDiv({ cls: 'afm-note', text: 'All sections are hidden. Turn them on in settings.' });
		// Full-width sections one under another; each run of half-width ones in two columns that grow on their own,
		// each section in the column you put it in (saved; new ones take turns). Empty space under a column takes drops too.
		// `order` keeps page order when narrow (one column).
		const list = el.createDiv({ cls: 'afm-sections' });
		let cols: HTMLElement[] = [];
		let band: string[] = []; // ids in the current run of half-width sections
		shown.forEach((x, i) => {
			const half = s.halfSections.includes(x.id);
			if (!half) cols = [];
			else if (cols.length === 0) {
				const row = list.createDiv({ cls: 'afm-band' });
				band = [];
				cols = [row.createDiv({ cls: 'afm-band-col' }), row.createDiv({ cls: 'afm-band-col' })];
				columnDrop(cols[0], 'left', band, ctx);
				columnDrop(cols[1], 'right', band, ctx);
			}
			if (half) {
				ctx.columns[x.id] = s.sectionColumns[x.id] ?? (band.length % 2 ? 'right' : 'left');
				band.push(x.id);
			}
			const parent = half ? cols[ctx.columns[x.id] === 'right' ? 1 : 0] : list;
			const body = section(parent, x, ctx);
			(parent.lastElementChild as HTMLElement | null)?.setCssProps({ order: String(i) });
			if (body) SECTION_DRAWERS[x.id](body, ctx);
		});
		el.scrollTop = scroll;
	}
}
