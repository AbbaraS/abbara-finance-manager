import type { SettingsContext } from './context';

// A <details> box that stays open or closed across redraws (remembered by `id`). Returns it to fill.
export function collapsible(el: HTMLElement, ctx: SettingsContext, id: string, summary: string): HTMLElement {
	const box = el.createEl('details', { cls: 'afm-edits' });
	box.createEl('summary', { text: summary });
	box.open = ctx.open.has(id);
	box.addEventListener('toggle', () => (box.open ? ctx.open.add(id) : ctx.open.delete(id)));
	return box;
}
