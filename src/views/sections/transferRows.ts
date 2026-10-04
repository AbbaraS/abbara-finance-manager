import { Menu, setTooltip } from 'obsidian';
import type { Flow } from '../../models/transferFlows';
import { UNKNOWN_ACCOUNT } from '../../models/transferFlows';
import { newestFirst, type Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { setIconSafe } from '../look/setIconSafe';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';

// Detail rows under a flow: this month's transfers, the top account's side on the left, the amount with an arrow,
// the other account's side on the right. Each side names its account.
export function transferRows(tbody: HTMLElement, flow: Flow, rows: Transaction[], span: number, ctx: DashboardContext): HTMLElement[] {
	if (rows.length === 0) {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		tr.createEl('td', { cls: 'afm-muted', text: 'None this month.', attr: { colspan: span } });
		return [tr];
	}
	const withStatements = new Set(ctx.rows.map((r) => r.account));
	return newestFirst(rows).map((t) => {
		const tr = tbody.createEl('tr', { cls: 'afm-detail afm-transfer' });
		const cell = tr.createEl('td', { attr: { colspan: span } });
		const grid = cell.createDiv({ cls: 'afm-transfer-grid' });

		// Which row sits on which side; money goes left → right when the left side paid out.
		const onLeft = t.account === flow.left;
		const [leftRow, rightRow] = onLeft ? [t, t.partner] : [t.partner, t];
		const toRight = onLeft === t.amount < 0;

		side(grid, leftRow, flow.left, 'is-left', withStatements, ctx);
		const mid = grid.createDiv({ cls: 'afm-transfer-mid' });
		mid.createDiv({ cls: 'afm-transfer-amount', text: toRight ? `${formatMoney(Math.abs(t.amount), ctx.settings)} →` : `← ${formatMoney(Math.abs(t.amount), ctx.settings)}` });
		const meta = mid.createDiv({ cls: 'afm-meta' });
		categoryButton(meta, t, ctx);
		moveButton(meta, t, ctx);
		side(grid, rightRow, flow.right, 'is-right', withStatements, ctx);

		noteLine(cell, t, ctx);
		return tr;
	});
}

// One account's side: its row's description, date and account, or why there's no row.
function side(grid: HTMLElement, row: Transaction | null, account: string, cls: string, withStatements: Set<string>, ctx: DashboardContext): void {
	const el = grid.createDiv({ cls: `afm-transfer-side ${cls}` });
	if (row) {
		el.createDiv({ cls: 'afm-name', text: row.description });
		el.createDiv({ cls: 'afm-muted', text: `${dayLabel(row.date, ctx.settings.locale)} · ${account}` });
	} else if (account === UNKNOWN_ACCOUNT) {
		el.createDiv({ cls: 'afm-muted', text: 'Other account not found' });
	} else if (withStatements.has(account)) {
		el.createDiv({ cls: 'afm-warning', text: 'Not in its statement' });
		el.createDiv({ cls: 'afm-muted', text: `No row with this amount within 4 days · ${account}` });
	} else {
		el.createDiv({ cls: 'afm-muted', text: `No statement · ${account}` });
	}
}

// Small button to send a transfer to another account (or let it be found again).
function moveButton(parent: HTMLElement, t: Transaction, ctx: DashboardContext): void {
	const btn = parent.createEl('button', { cls: `afm-move clickable-icon${t.otherAccount ? ' is-set' : ''}` });
	setIconSafe(btn, 'arrow-left-right');
	setTooltip(btn, t.otherAccount ? `Other account set by hand (${t.otherAccount}). Click to change.` : 'Wrong account? Click to change.');
	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't toggle the row
		const menu = new Menu();
		menu.addItem((i) => i.setTitle(t.amount < 0 ? 'Sent to' : 'Came from').setIsLabel(true));
		menu.addItem((i) => i.setTitle('Find automatically').setChecked(!t.otherAccount).onClick(() => ctx.saveLabel(t, { other: '' })));
		for (const a of ctx.accounts) {
			if (a !== t.account) menu.addItem((i) => i.setTitle(a).setChecked(t.otherAccount === a).onClick(() => ctx.saveLabel(t, { other: a })));
		}
		menu.showAtMouseEvent(e);
	});
}
