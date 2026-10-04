import { setTooltip } from 'obsidian';
import { keptOf } from '../../models/linkRefunds';
import type { Transaction } from '../../models/Transaction';
import { dayLabel } from '../../utils/dates';
import { formatMoney } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';

// "Refunded" / "Part refunded" on a purchase, "Refund" on money back, with the other side on hover. Nothing otherwise.
export function refundBadge(parent: HTMLElement, t: Transaction, ctx: DashboardContext): void {
	const s = ctx.settings;
	const day = (x: Transaction) => dayLabel(x.date, s.locale);
	if (t.refunds.length) {
		const full = keptOf(t) === 0;
		const el = parent.createSpan({ cls: `afm-refund-badge${full ? ' is-full' : ''}`, text: full ? 'Refunded' : 'Part refunded' });
		setTooltip(el, t.refunds.map((r) => `${formatMoney(r.amount, s)} back on ${day(r)}`).join('\n') + (full ? '' : `\n${formatMoney(keptOf(t), s)} still spent`));
	} else if (t.refundOf) {
		const el = parent.createSpan({ cls: 'afm-refund-badge', text: 'Refund' });
		setTooltip(el, `Of ${t.refundOf.description}, ${day(t.refundOf)}, ${formatMoney(-t.refundOf.amount, s)}`);
	}
}
