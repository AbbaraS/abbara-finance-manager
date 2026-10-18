import { App, FuzzySuggestModal } from 'obsidian';
import type { FinanceSettings } from '../models/FinanceSettings';
import { keptOf } from '../models/linkRefunds';
import type { Transaction } from '../models/Transaction';
import { dayLabel } from '../utils/dates';
import { formatChange, formatMoney } from '../utils/money';

// Search box listing purchases a payment could pay back (see purchasesFor); type a shop, date or amount.
export class PurchasePicker extends FuzzySuggestModal<Transaction> {
	constructor(app: App, private list: Transaction[], private s: FinanceSettings, private onPick: (t: Transaction) => void) {
		super(app);
		this.setPlaceholder('Which purchase does it pay back?');
	}

	getItems() { return this.list; }

	// "Clarks · 24 Jun · Revolut GBP · −£110.00 (£55.00 left)": the name, date and amount are all searchable.
	getItemText(t: Transaction): string {
		const left = keptOf(t) < -t.amount - 0.005 ? ` (${formatMoney(keptOf(t), this.s)} left)` : '';
		return `${t.counterparty || t.description} · ${dayLabel(t.date, this.s.locale)} ${t.date.slice(0, 4)} · ${t.account} · ${formatChange(t.amount, this.s)}${left}`;
	}

	onChooseItem(t: Transaction) { this.onPick(t); }
}
