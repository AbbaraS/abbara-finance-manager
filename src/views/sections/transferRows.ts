import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatChange } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';

// Detail rows under a flow: this month's transfers, each spanning the whole table.
export function transferRows(tbody: HTMLElement, rows: Transaction[], span: number, ctx: DashboardContext): HTMLElement[] {
	const s = ctx.settings;
	if (rows.length === 0) {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		tr.createEl('td', { cls: 'afm-muted', text: 'None this month.', attr: { colspan: span } });
		return [tr];
	}
	return rows.map((t) => {
		const tr = tbody.createEl('tr', { cls: 'afm-detail' });
		const cell = tr.createEl('td', { attr: { colspan: span } });
		const line = cell.createDiv({ cls: 'afm-meta' });
		line.createSpan({ text: t.description });
		line.createSpan({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.account} · ${formatChange(t.amount, s)}` });
		categoryButton(line, t, ctx);
		noteLine(cell, t.note);
		return tr;
	});
}
