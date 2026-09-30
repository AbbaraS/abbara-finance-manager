import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatChange } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { categoryButton } from './categoryButton';
import { noteLine } from './noteLine';

// Detail rows under a flow: this month's transfers, each spanning the whole table,
// with a dropdown to move one to another account.
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

		// The matching row in the other account.
		const p = t.partner;
		if (p) cell.createDiv({ cls: 'afm-muted', text: `Paired with: ${p.description} · ${dayLabel(p.date, s.locale)} · ${p.account} · ${formatChange(p.amount, s)}` });

		// Other account: found automatically (shows what was found) or picked by hand.
		const move = line.createEl('label', { cls: 'afm-move afm-muted', text: t.amount < 0 ? 'Sent to ' : 'Came from ' });
		const select = move.createEl('select', { cls: 'dropdown' });
		select.createEl('option', { value: '', text: `Find automatically${!t.otherAccount && t.foundAccount ? ` (${t.foundAccount})` : ''}` });
		for (const a of ctx.accounts) if (a !== t.account) select.createEl('option', { value: a, text: a });
		select.value = t.otherAccount;
		select.addEventListener('click', (e) => e.stopPropagation()); // don't toggle the row
		select.addEventListener('change', () => ctx.saveLabel(t, { other: select.value }));

		noteLine(cell, t);
		return tr;
	});
}
