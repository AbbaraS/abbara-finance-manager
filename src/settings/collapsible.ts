import { setIcon } from 'obsidian';
import type { SettingsContext } from './context';

// A <details> box that stays open or closed across redraws (remembered by `id`). Returns it to fill.
export function collapsible(el: HTMLElement, ctx: SettingsContext, id: string, summary: string): HTMLElement {
	const box = el.createEl('details', { cls: 'afm-edits' });
	box.createEl('summary', { text: summary });
	box.open = ctx.open.has(id);
	box.addEventListener('toggle', () => (box.open ? ctx.open.add(id) : ctx.open.delete(id)));
	return box;
}

// A whole settings block (Categories, People...): click its heading to open or close everything under it.
// Closed until opened; remembered by `id` across redraws while Obsidian is open.
export function foldable(el: HTMLElement, ctx: SettingsContext, id: string, draw: (el: HTMLElement, ctx: SettingsContext) => void): void {
	const block = el.createDiv({ cls: 'afm-block' });
	draw(block, ctx);
	const head = block.querySelector<HTMLElement>(':scope > .setting-item-heading');
	if (!head) return;

	// Everything after the heading goes into a body that hides when closed.
	const body = block.createDiv({ cls: 'afm-block-body' });
	while (head.nextSibling && head.nextSibling !== body) body.appendChild(head.nextSibling);

	const chevron = createSpan({ cls: 'afm-block-chevron' });
	setIcon(chevron, 'chevron-right');
	head.querySelector('.setting-item-name')?.prepend(chevron);
	head.addClass('afm-block-head');
	head.setAttrs({ tabindex: '0', role: 'button' });

	const show = (open: boolean) => {
		block.toggleClass('is-open', open);
		head.setAttr('aria-expanded', String(open));
	};
	const toggle = () => {
		if (ctx.open.has(id)) ctx.open.delete(id);
		else ctx.open.add(id);
		show(ctx.open.has(id));
	};
	show(ctx.open.has(id));
	// Buttons on the heading (e.g. Add) keep working without folding it.
	head.addEventListener('click', (e) => {
		if (!(e.target as HTMLElement).closest('.setting-item-control')) toggle();
	});
	head.addEventListener('keydown', (e) => {
		if ((e.key === 'Enter' || e.key === ' ') && e.target === head) {
			e.preventDefault();
			toggle();
		}
	});
}
