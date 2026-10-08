import { setIcon } from 'obsidian';
import { monthLabel } from '../../utils/dates';
import type { DashboardContext } from '../DashboardContext';
import { iconDot } from '../look/iconDot';

// Title with previous/next and reload buttons, then year tabs and the chosen year's months.
export function header(el: HTMLElement, ctx: DashboardContext): void {
	const bar = el.createDiv({ cls: 'afm-header' });
	const title = bar.createEl('h1', { cls: 'afm-title' });
	iconDot(title, 'wallet', 'var(--interactive-accent)', 'afm-title-icon');
	title.createSpan({ text: ctx.title });
	const controls = bar.createDiv({ cls: 'afm-controls' });

	const i = ctx.months.indexOf(ctx.month);
	const label = (m: string) => monthLabel(m, ctx.settings.locale);
	iconButton(controls, 'chevron-left', i > 0 ? `Previous: ${label(ctx.months[i - 1])}` : 'Previous month', i > 0, () => ctx.selectMonth(ctx.months[i - 1]));
	iconButton(controls, 'chevron-right', i < ctx.months.length - 1 ? `Next: ${label(ctx.months[i + 1])}` : 'Next month', i < ctx.months.length - 1, () => ctx.selectMonth(ctx.months[i + 1]));
	iconButton(controls, 'refresh-cw', 'Reload', true, ctx.reload);

	// Years with data. Picking one keeps the same month if it has data there, else its latest month.
	const period = el.createDiv({ cls: 'afm-period' });
	const year = ctx.month.slice(0, 4);
	const years = [...new Set(ctx.months.map((m) => m.slice(0, 4)))];
	const yearTabs = period.createDiv({ cls: 'afm-years', attr: { role: 'tablist', 'aria-label': 'Year' } });
	for (const y of years) {
		const inYear = ctx.months.filter((m) => m.startsWith(y));
		const same = `${y}${ctx.month.slice(4)}`;
		tab(yearTabs, y, y === year, true, y, () => ctx.selectMonth(inYear.includes(same) ? same : inYear[inYear.length - 1]));
	}

	// Jan-Dec of the chosen year; months without rows can't be picked.
	const monthTabs = period.createDiv({ cls: 'afm-months', attr: { role: 'tablist', 'aria-label': 'Month' } });
	for (let n = 1; n <= 12; n++) {
		const m = `${year}-${String(n).padStart(2, '0')}`;
		const has = ctx.months.includes(m);
		const short = new Date(Number(year), n - 1, 1).toLocaleDateString(ctx.settings.locale, { month: 'short' });
		tab(monthTabs, short, m === ctx.month, has, has ? label(m) : `${label(m)}: no transactions`, () => ctx.selectMonth(m));
	}
}

// One tab: a small button, highlighted when chosen.
function tab(parent: HTMLElement, text: string, active: boolean, enabled: boolean, tip: string, onClick: () => void): void {
	const btn = parent.createEl('button', { cls: 'afm-tab', text, attr: { role: 'tab', 'aria-selected': String(active), 'aria-label': tip } });
	btn.toggleClass('is-active', active);
	btn.disabled = !enabled;
	if (!active) btn.addEventListener('click', onClick);
}

// A small icon button.
function iconButton(parent: HTMLElement, icon: string, label: string, enabled: boolean, onClick: () => void): void {
	const btn = parent.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': label } });
	setIcon(btn, icon);
	btn.disabled = !enabled;
	btn.addEventListener('click', onClick);
}
