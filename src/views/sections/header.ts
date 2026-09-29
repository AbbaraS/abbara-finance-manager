import { setIcon } from 'obsidian';
import { monthLabel } from '../../utils/dates';
import type { DashboardContext } from '../DashboardContext';
import { iconDot } from '../look/iconDot';

// Title, month picker with previous/next buttons, and a reload button.
export function header(el: HTMLElement, ctx: DashboardContext): void {
	const bar = el.createDiv({ cls: 'afm-header' });
	const title = bar.createEl('h1', { cls: 'afm-title' });
	iconDot(title, 'wallet', 'var(--interactive-accent)', 'afm-title-icon');
	title.createSpan({ text: 'Finances' });
	const controls = bar.createDiv({ cls: 'afm-controls' });

	const i = ctx.months.indexOf(ctx.month);
	iconButton(controls, 'chevron-left', 'Previous month', i > 0, () => ctx.selectMonth(ctx.months[i - 1]));

	const select = controls.createEl('select', { cls: 'dropdown' });
	for (const m of [...ctx.months].reverse()) {
		select.createEl('option', { value: m, text: monthLabel(m, ctx.settings.locale) });
	}
	select.value = ctx.month;
	select.addEventListener('change', () => ctx.selectMonth(select.value));

	iconButton(controls, 'chevron-right', 'Next month', i < ctx.months.length - 1, () => ctx.selectMonth(ctx.months[i + 1]));
	iconButton(controls, 'refresh-cw', 'Reload CSVs', true, ctx.reload);
}

// A small icon button.
function iconButton(parent: HTMLElement, icon: string, label: string, enabled: boolean, onClick: () => void): void {
	const btn = parent.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': label } });
	setIcon(btn, icon);
	btn.disabled = !enabled;
	btn.addEventListener('click', onClick);
}
