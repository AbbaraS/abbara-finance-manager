import { Menu, setTooltip } from 'obsidian';
import type { TransferLink } from '../../data/tables';
import { newestFirst, type Transaction } from '../../models/Transaction';
import { UNKNOWN_ACCOUNT } from '../../models/transferFlows';
import { countLabel } from '../../utils/countLabel';
import { dayLabel, daysBetween } from '../../utils/dates';
import { formatMoney, formatTidy } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import { accountLook } from '../look/accountLook';
import { iconDot } from '../look/iconDot';
import { setIconSafe } from '../look/setIconSafe';
import { showMore } from './showMore';

// Transfers shown per card before "Show more".
const LIMIT = 4;

// Most days between the two sides when you pick one by hand.
const PICK_DAYS = 7;

// One account's transfers in the shown month: money in and out (in its currency), and what came in.
interface Card {
	account: string;
	currency: string;
	in: number;
	out: number;
	sentTo: Map<string, number>; // money out, by the account it went to
	rows: { from: Transaction; into: Transaction | null; link: TransferLink | null }[]; // what came in; into null = no other side
}

// Drag data type, so Obsidian doesn't treat a moving card as dropped text.
const DRAG_TYPE = 'application/x-afm-account';

// Transfers between your own accounts in the shown month: a bar of where money went, then a card per account
// (two per row, in your account order; drag a card to move it): in, out and what's left, and each transfer that
// came in, with Unlink. Below: transfers missing their other side (Link…, or "no other side") and pairs you unlinked.
export function transferLinks(body: HTMLElement, ctx: DashboardContext): void {
	const s = ctx.settings;
	const look = (account: string) => accountLook(account, ctx.labels.accounts);
	const inMonth = (l: TransferLink) => l.out.month === ctx.month || l.into.month === ctx.month;
	const linked = ctx.links.filter((l) => l.status !== 'rejected' && inMonth(l));
	const unlinked = ctx.links.filter((l) => l.status === 'rejected' && inMonth(l) && !l.out.partner && !l.into.partner);
	const moves = ctx.rows.filter((t) => t.month === ctx.month && t.kind === 'transfer');
	const oneSided = moves.filter((t) => !t.partner && t.otherAccount);
	const alone = newestFirst(moves.filter((t) => !t.partner && !t.otherAccount));
	const cards = buildCards(ctx, moves, linked, oneSided);
	body.createDiv({ cls: 'afm-note', text: `${countLabel(linked.length, 'transfer')} linked, ${countLabel(oneSided.length, 'one-sided transfer')}, ${countLabel(alone.length, 'row')} without the other side.` });

	// Where the money went: one bar in your currency, a part per account, and a legend.
	const home = cards.filter((c) => c.currency === s.currency && c.in > 0);
	if (home.length) {
		const bar = body.createDiv({ cls: 'afm-tl-bar' });
		const legend = body.createDiv({ cls: 'afm-tl-legend' });
		for (const c of home) {
			const color = { '--afm-acc': look(c.account).color };
			const part = bar.createSpan();
			part.setCssProps(color);
			part.setCssStyles({ flexGrow: String(c.in) });
			setTooltip(part, `Into ${c.account}: ${formatMoney(c.in, s)}`);
			legend.createSpan({ text: `${c.account} ${formatTidy(c.in, s)}` }).setCssProps(color);
		}
	}

	// Cards, two per row.
	const grid = body.createDiv({ cls: 'afm-tl-wrap' }).createDiv({ cls: 'afm-tl-cards' });
	for (const c of cards) drawCard(grid, c, ctx);

	// Transfer rows with no other side: link one, or say there is none (a transfer to/from an account without statements).
	if (alone.length) {
		const box = group(body, { icon: 'unlink', color: 'var(--afm-c-gray)' }, 'Without the other side', countLabel(alone.length, 'row'));
		const rows = alone.map((t) => {
			const { text, amount, row } = item(box, look(t.account));
			const name = text.createDiv({ cls: 'afm-tl-name' });
			name.createSpan({ text: t.account });
			name.createSpan({ cls: 'afm-tl-arrow', text: t.amount < 0 ? '→' : '←' });
			name.createSpan({ cls: 'afm-tl-other', text: t.foundAccount }).setCssProps({ '--afm-acc': look(t.foundAccount).color });
			text.createDiv({ cls: 'afm-muted', text: `${dayLabel(t.date, s.locale)} · ${t.description}` });
			amount.createDiv({ cls: 'afm-strong', text: (t.amount < 0 ? '−' : '+') + money(t, ctx) });
			iconButton(row, 'link', 'Link to its other side, or mark it as having none', (e) => pickOtherSide(e, t, ctx));
			return row;
		});
		showMore(box, rows, LIMIT);
	}

	// Pairs you unlinked (and not linked to anything else since), faded, with Link again.
	if (unlinked.length) {
		const box = group(body, { icon: 'undo-2', color: 'var(--afm-c-gray)' }, 'Unlinked by you', countLabel(unlinked.length, 'pair'));
		box.addClass('is-unlinked');
		for (const l of unlinked) {
			const { text, amount, row } = item(box, look(l.out.account));
			text.createDiv({ cls: 'afm-tl-name', text: `${l.out.account} → ${l.into.account}` });
			text.createDiv({ cls: 'afm-muted', text: `${dayLabel(l.out.date, s.locale)} · ${l.out.description}` });
			text.createDiv({ cls: 'afm-muted', text: `↳ ${dayLabel(l.into.date, s.locale)} · ${l.into.description}` });
			amount.createDiv({ cls: 'afm-strong', text: money(l.into, ctx) });
			iconButton(row, 'link', 'Link again', () => ctx.editTransfer('link', l.out, l.into));
		}
	}
}

// Money as the row's own currency, without a sign.
function money(t: Transaction, ctx: DashboardContext, amount = t.amount): string {
	return formatMoney(Math.abs(amount), { ...ctx.settings, currency: t.currency });
}

// Cards in your account order: in/out for every transfer row on its own account (a row with no other side also
// counts on the account it names), and what came in: linked pairs and one-sided transfers.
function buildCards(ctx: DashboardContext, moves: Transaction[], linked: TransferLink[], oneSided: Transaction[]): Card[] {
	const cards = new Map<string, Card>();
	const currencyOf = new Map(ctx.rows.map((t) => [t.account, t.currency]));
	const card = (account: string, currency = currencyOf.get(account) ?? ctx.settings.currency) => {
		let c = cards.get(account);
		if (!c) cards.set(account, (c = { account, currency, in: 0, out: 0, sentTo: new Map(), rows: [] }));
		return c;
	};
	const send = (c: Card, to: string, amount: number) => c.sentTo.set(to, (c.sentTo.get(to) ?? 0) + amount);
	for (const t of moves) {
		const other = t.partner?.account ?? (t.otherAccount || t.foundAccount);
		const own = card(t.account);
		if (t.amount < 0) { own.out -= t.amount; send(own, other, -t.amount); } else own.in += t.amount;
		if (t.partner || !other || other === UNKNOWN_ACCOUNT) continue;
		const mirror = card(other, t.currency);
		if (t.amount < 0) mirror.in -= t.amount;
		else { mirror.out += t.amount; send(mirror, t.account, t.amount); }
	}
	for (const l of linked) card(l.into.account).rows.push({ from: l.out, into: l.into, link: l });
	for (const t of oneSided) card(t.amount > 0 ? t.account : t.otherAccount).rows.push({ from: t, into: t.amount > 0 ? t : null, link: null });
	const order = ctx.labels.accounts.map((a) => a.name);
	const rank = (n: string) => (order.includes(n) ? order.indexOf(n) : order.length);
	return [...cards.values()].sort((a, b) => rank(a.account) - rank(b.account));
}

// One account's card: grip, icon, name, what's left; in / out / sent to; then what came in.
function drawCard(grid: HTMLElement, c: Card, ctx: DashboardContext): void {
	const s = ctx.settings;
	const look = (account: string) => accountLook(account, ctx.labels.accounts);
	const fmt = (v: number) => formatMoney(v, { ...s, currency: c.currency });
	const box = group(grid, look(c.account), c.account, '');
	box.addClass('afm-tl-card');
	const head = box.querySelector('.afm-tl-head') as HTMLElement;
	const grip = head.createSpan({ cls: 'afm-grip afm-tl-grip', attr: { 'aria-label': 'Drag to move' } });
	setIconSafe(grip, 'grip-vertical');
	head.prepend(grip);
	const left = c.in - c.out;
	const net = head.createDiv({ cls: `afm-tl-left ${left > 0 ? 'is-up' : left < 0 ? 'is-down' : ''}` });
	net.createDiv({ text: (left > 0 ? '+' : left < 0 ? '−' : '') + fmt(Math.abs(left)) });
	net.createDiv({ cls: 'afm-muted', text: 'left' });
	setTooltip(net, 'Money in minus money out by transfers this month');
	(head.querySelector('.afm-muted') as HTMLElement).setText(`In ${fmt(c.in)} · Out ${fmt(c.out)}`);
	if (c.sentTo.size) {
		const sent = box.createDiv({ cls: 'afm-tl-sent' });
		sent.createSpan({ cls: 'afm-muted', text: 'Sent to ' });
		[...c.sentTo].sort((a, b) => b[1] - a[1]).forEach(([to, v], i) => {
			if (i) sent.createSpan({ cls: 'afm-muted', text: ' · ' });
			sent.createSpan({ cls: 'afm-tl-other', text: `${to} ${formatTidy(v, { ...s, currency: c.currency })}` }).setCssProps({ '--afm-acc': look(to).color });
		});
	}

	// What came in.
	if (c.rows.length === 0) box.createDiv({ cls: 'afm-muted afm-tl-none', text: 'Nothing came in by transfer this month.' });
	const rows = newestFirstBy(c.rows).map(({ from, into, link }) => {
		const fromAccount = link ? from.account : from.amount > 0 ? from.otherAccount : from.account;
		const { text, amount, row } = item(box, look(fromAccount));
		text.createDiv({ cls: 'afm-tl-name', text: `From ${fromAccount}` });
		const out = link ? link.out : from.amount < 0 ? from : null;
		text.createDiv({ cls: 'afm-muted', text: out ? `${dayLabel(out.date, s.locale)} · ${out.description}` : `Not in ${fromAccount}'s statements` });
		text.createDiv({ cls: 'afm-muted', text: into ? `↳ ${dayLabel(into.date, s.locale)} · ${into.description}` : `↳ Not in ${c.account}'s statements` });
		amount.createDiv({ cls: 'afm-strong', text: money(into ?? from, ctx) });
		if (link && link.out.currency !== link.into.currency) amount.createDiv({ cls: 'afm-muted', text: `from ${money(link.out, ctx)}` });
		if (link?.status === 'confirmed') amount.createDiv({ cls: 'afm-tl-badge', text: 'linked by you' });
		if (!link) amount.createDiv({ cls: 'afm-tl-badge', text: 'one-sided' });
		if (link) iconButton(row, 'unlink', 'Unlink: not the same money', () => ctx.editTransfer('unlink', link.out, link.into));
		else iconButton(row, 'undo-2', 'Not a one-sided transfer: back to the rules', () => ctx.saveLabel(from, { other: '', category: '', sub: '' }));
		return row;
	});
	showMore(box, rows, LIMIT);

	// Drag the grip onto another card to move this account there (your account order, also in settings).
	grip.addEventListener('mousedown', () => {
		box.draggable = true;
		window.addEventListener('mouseup', () => (box.draggable = false), { once: true });
	});
	box.addEventListener('dragstart', (e) => { e.dataTransfer?.setData(DRAG_TYPE, c.account); box.addClass('is-dragging'); });
	box.addEventListener('dragend', () => { box.draggable = false; box.removeClass('is-dragging'); });
	box.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes(DRAG_TYPE)) { e.preventDefault(); box.addClass('is-drop'); } });
	box.addEventListener('dragleave', () => box.removeClass('is-drop'));
	box.addEventListener('drop', (e) => {
		box.removeClass('is-drop');
		const name = e.dataTransfer?.getData(DRAG_TYPE);
		const list = ctx.labels.accounts;
		const from = list.findIndex((a) => a.name === name), to = list.findIndex((a) => a.name === c.account);
		if (from < 0 || to < 0 || from === to) return;
		e.preventDefault();
		list.splice(to, 0, ...list.splice(from, 1));
		ctx.save();
	});
}

// Card rows newest first (by the side that came in, else the side that went out).
function newestFirstBy<T extends { from: Transaction; into: Transaction | null }>(rows: T[]): T[] {
	return [...rows].sort((a, b) => (b.into ?? b.from).date.localeCompare((a.into ?? a.from).date));
}

// A box with a coloured side and a head: icon, title, a muted line under it.
function group(parent: HTMLElement, look: { icon: string; color: string }, title: string, sub: string): HTMLElement {
	const box = parent.createDiv({ cls: 'afm-tl-group' });
	box.setCssProps({ '--afm-acc': look.color });
	const head = box.createDiv({ cls: 'afm-tl-head' });
	iconDot(head, look.icon, look.color);
	const words = head.createDiv({ cls: 'afm-tl-title' });
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

// A small icon button with a tooltip.
function iconButton(parent: HTMLElement, icon: string, tip: string, onClick: (e: MouseEvent) => void): void {
	const b = parent.createEl('button', { cls: 'clickable-icon afm-tl-btn', attr: { 'aria-label': tip } });
	setIconSafe(b, icon);
	setTooltip(b, tip);
	b.addEventListener('click', onClick);
}

// Menu of rows that could be the other side (your other accounts, money the other way, within PICK_DAYS, the same
// amount first, any amount between currencies), then "no other side": a transfer to or from an account by hand.
function pickOtherSide(e: MouseEvent, t: Transaction, ctx: DashboardContext): void {
	const s = ctx.settings;
	const off = (u: Transaction) => (u.currency !== t.currency || Math.abs(u.amount + t.amount) < 0.005 ? 0 : 1000) + Math.abs(daysBetween(t.date, u.date));
	const fits = ctx.rows
		.filter((u) => u.account !== t.account && u.amount * t.amount < 0 && Math.abs(daysBetween(t.date, u.date)) <= PICK_DAYS)
		.sort((a, b) => off(a) - off(b))
		.slice(0, 12);
	const menu = new Menu();
	menu.addItem((i) => i.setTitle(fits.length ? 'Other side' : `Nothing within ${PICK_DAYS} days in your other accounts`).setIsLabel(true));
	for (const u of fits) {
		const taken = u.partner ? ' (in another pair)' : '';
		menu.addItem((i) => i.setTitle(`${dayLabel(u.date, s.locale)} · ${u.account} · ${money(u, ctx)} · ${u.description}${taken}`)
			.onClick(() => ctx.editTransfer('link', t.amount < 0 ? t : u, t.amount < 0 ? u : t)));
	}
	menu.addSeparator();
	menu.addItem((i) => i.setTitle(`No other side: ${t.amount < 0 ? 'sent to' : 'came from'}`).setIsLabel(true));
	const transfer = ctx.labels.categories.find((c) => c.kind === 'transfer')?.name ?? 'Transfer';
	for (const a of ctx.labels.accounts) {
		if (a.name === t.account) continue;
		menu.addItem((i) => i.setTitle(a.name).setChecked(a.name === t.foundAccount)
			.onClick(() => ctx.saveLabel(t, { category: transfer, sub: '', person: '', other: a.name })));
	}
	menu.showAtMouseEvent(e);
}
