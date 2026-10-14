import { Menu, setTooltip } from 'obsidian';
import type { TransferLink } from '../../data/DevDatabase';
import { newestFirst, type Transaction } from '../../models/Transaction';
import { countLabel } from '../../utils/countLabel';
import { dayLabel, daysBetween } from '../../utils/dates';
import { formatMoney, formatTidy } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { accountLook } from '../look/accountLook';
import { iconDot } from '../look/iconDot';
import { showMore } from './showMore';

// Transfers per account shown before "Show more".
const LIMIT = 5;

// Most days between the two sides when you pick one by hand.
const PICK_DAYS = 7;

// Transfers between your own accounts in the shown month (dev dashboard only), in each account's colour:
// a bar of where the money went, then one box per account the money went into, with Unlink on each pair.
// Below: rows without their other side (Link…) and pairs you unlinked (Link again). make dev keeps your fixes.
export function transferLinks(body: HTMLElement, ctx: DashboardContext): void {
	const x = ctx.transfers;
	if (!x) return void body.createDiv({ cls: 'afm-muted', text: 'Only in the dev dashboard.' });
	const s = ctx.settings;
	const look = (account: string) => accountLook(account, ctx.labels.accounts);
	const money = (t: Transaction) => formatMoney(Math.abs(t.amount), { ...s, currency: t.currency });
	const inMonth = (l: TransferLink) => l.out.month === ctx.month || l.into.month === ctx.month;
	const linked = x.links.filter((l) => l.status !== 'rejected' && inMonth(l)).sort((a, b) => b.into.date.localeCompare(a.into.date));
	const unlinked = x.links.filter((l) => l.status === 'rejected' && inMonth(l));
	const alone = newestFirst(ctx.rows.filter((t) => t.month === ctx.month && t.kind === 'transfer' && !t.partner));
	body.createDiv({ cls: 'afm-note', text: `${countLabel(linked.length, 'transfer')} linked, ${countLabel(alone.length, 'row')} without the other side. Your fixes are saved to dev-edits.sql, so make dev keeps them.` });

	// Pairs by the account the money went into, most money first.
	const groups = new Map<string, TransferLink[]>();
	for (const l of linked) groups.set(l.into.account, [...(groups.get(l.into.account) ?? []), l]);
	const total = (list: TransferLink[]) => list.reduce((a, l) => a + l.into.amount, 0);
	const sorted = [...groups].sort((a, b) => total(b[1]) - total(a[1]));

	// Where the money went: one bar in your currency, a part per account, and a legend.
	const home = sorted.filter(([, list]) => list[0].into.currency === s.currency);
	if (home.length) {
		const bar = body.createDiv({ cls: 'afm-tl-bar' });
		const legend = body.createDiv({ cls: 'afm-tl-legend' });
		for (const [account, list] of home) {
			const color = { '--afm-acc': look(account).color };
			const part = bar.createSpan();
			part.setCssProps(color);
			part.setCssStyles({ flexGrow: String(total(list)) });
			setTooltip(part, `Into ${account}: ${formatMoney(total(list), s)}`);
			legend.createSpan({ text: `${account} ${formatTidy(total(list), s)}` }).setCssProps(color);
		}
	}

	// One box per account: its colour down the side, total, then each pair (from which account, both sides, amount).
	for (const [account, list] of sorted) {
		const box = group(body, look(account), `Into ${account}`, countLabel(list.length, 'transfer'));
		box.createDiv({ cls: 'afm-tl-total', text: formatMoney(total(list), { ...s, currency: list[0].into.currency }) });
		const rows = list.map((l) => {
			const { text, amount, row } = item(box, look(l.out.account));
			text.createDiv({ cls: 'afm-tl-name', text: `From ${l.out.account}` });
			text.createDiv({ cls: 'afm-muted', text: `${dayLabel(l.out.date, s.locale)} · ${l.out.description}` });
			text.createDiv({ cls: 'afm-muted', text: `↳ ${dayLabel(l.into.date, s.locale)} · ${l.into.description}` });
			amount.createDiv({ cls: 'afm-strong', text: money(l.into) });
			if (l.out.currency !== l.into.currency) amount.createDiv({ cls: 'afm-muted', text: `from ${money(l.out)}` });
			if (l.status === 'confirmed') amount.createDiv({ cls: 'afm-tl-badge', text: 'linked by you' });
			row.createEl('button', { cls: 'afm-tl-btn', text: 'Unlink' }).addEventListener('click', () => x.edit('unlink', l.out, l.into));
			return row;
		});
		showMore(box, rows, LIMIT);
	}

	// Transfer rows with no other side: the account it should be with, in its colour; Link… picks the row.
	if (alone.length) {
		const box = group(body, { icon: 'unlink', color: 'var(--afm-c-gray)' }, 'Without the other side', countLabel(alone.length, 'row'));
		const rows = alone.map((t) => {
			const { text, amount, row } = item(box, look(t.account));
			const name = text.createDiv({ cls: 'afm-tl-name' });
			name.createSpan({ text: t.account });
			name.createSpan({ cls: 'afm-tl-arrow', text: t.amount < 0 ? '→' : '←' });
			name.createSpan({ cls: 'afm-tl-other', text: t.foundAccount }).setCssProps({ '--afm-acc': look(t.foundAccount).color });
			text.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.description}` });
			amount.createDiv({ cls: 'afm-strong', text: (t.amount < 0 ? '−' : '+') + money(t) });
			row.createEl('button', { cls: 'afm-tl-btn', text: 'Link…' }).addEventListener('click', (e) => pickOtherSide(e, t, ctx));
			return row;
		});
		showMore(box, rows, LIMIT);
	}

	// Pairs you unlinked, faded, with Link again.
	if (unlinked.length) {
		const box = group(body, { icon: 'undo-2', color: 'var(--afm-c-gray)' }, 'Unlinked by you', countLabel(unlinked.length, 'pair'));
		box.addClass('is-unlinked');
		for (const l of unlinked) {
			const { text, amount, row } = item(box, look(l.out.account));
			text.createDiv({ cls: 'afm-tl-name', text: `${l.out.account} → ${l.into.account}` });
			text.createDiv({ cls: 'afm-muted', text: `${dayLabel(l.out.date, s.locale)} · ${l.out.description}` });
			text.createDiv({ cls: 'afm-muted', text: `↳ ${dayLabel(l.into.date, s.locale)} · ${l.into.description}` });
			amount.createDiv({ cls: 'afm-strong', text: money(l.into) });
			row.createEl('button', { cls: 'afm-tl-btn', text: 'Link again' }).addEventListener('click', () => x.edit('link', l.out, l.into));
		}
	}
}

// A box with a coloured side and a head: icon, title, a muted line under it.
function group(body: HTMLElement, look: { icon: string; color: string }, title: string, sub: string): HTMLElement {
	const box = body.createDiv({ cls: 'afm-tl-group' });
	box.setCssProps({ '--afm-acc': look.color });
	const head = box.createDiv({ cls: 'afm-tl-head' });
	iconDot(head, look.icon, look.color);
	const words = head.createDiv();
	words.createDiv({ cls: 'afm-strong', text: title });
	words.createDiv({ cls: 'afm-muted', text: sub });
	return box;
}

// One row in a box: the account's icon in its colour, then text, amount and a button (added by the caller).
function item(box: HTMLElement, look: { icon: string; color: string }): { row: HTMLElement; text: HTMLElement; amount: HTMLElement } {
	const row = box.createDiv({ cls: 'afm-tl-row' });
	row.setCssProps({ '--afm-from': look.color });
	iconDot(row, look.icon, look.color);
	return { row, text: row.createDiv({ cls: 'afm-tl-text' }), amount: row.createDiv({ cls: 'afm-tl-amount' }) };
}

// Menu of rows that could be the other side: your other accounts, money the other way, within PICK_DAYS,
// the same amount first (any amount between currencies), then the nearest day.
function pickOtherSide(e: MouseEvent, t: Transaction, ctx: DashboardContext): void {
	const s = ctx.settings;
	const off = (u: Transaction) => (u.currency !== t.currency || Math.abs(u.amount + t.amount) < 0.005 ? 0 : 1000) + Math.abs(daysBetween(t.date, u.date));
	const fits = ctx.rows
		.filter((u) => u.account !== t.account && u.amount * t.amount < 0 && Math.abs(daysBetween(t.date, u.date)) <= PICK_DAYS)
		.sort((a, b) => off(a) - off(b))
		.slice(0, 15);
	const menu = new Menu();
	menu.addItem((i) => i.setTitle(fits.length ? 'Other side' : `Nothing within ${PICK_DAYS} days in your other accounts`).setIsLabel(true));
	for (const u of fits) {
		const amount = formatMoney(Math.abs(u.amount), { ...s, currency: u.currency });
		const taken = u.partner ? ' (in another pair)' : '';
		menu.addItem((i) => i.setTitle(`${dayLabel(u.date, s.locale)} · ${u.account} · ${amount} · ${u.description}${taken}`)
			.onClick(() => ctx.transfers?.edit('link', t.amount < 0 ? t : u, t.amount < 0 ? u : t)));
	}
	menu.showAtMouseEvent(e);
}
