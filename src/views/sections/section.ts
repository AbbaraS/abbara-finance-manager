import { moveSection, type Section } from '../../models/sections';
import type { DashboardContext } from '../DashboardContext';
import { setIconSafe } from '../look/setIconSafe';

// Drag data type, so Obsidian doesn't treat a moving section as dropped text.
const DRAG_TYPE = 'application/x-afm-section';
let dragging = ''; // id of the section being dragged

// A section box with a title bar: click it to collapse, drag the grip to move the section.
// Returns the body to draw into, or null when collapsed.
export function section(parent: HTMLElement, x: Section, ctx: DashboardContext): HTMLElement | null {
	const s = ctx.settings;
	const collapsed = s.collapsedSections.includes(x.id);
	const wrap = parent.createDiv({ cls: 'afm-section' });
	wrap.toggleClass('is-collapsed', collapsed);
	const h = wrap.createEl('h2', { cls: 'afm-section-title', attr: { tabindex: '0', role: 'button', 'aria-expanded': String(!collapsed) } });
	const grip = h.createSpan({ cls: 'afm-grip', attr: { 'aria-label': 'Drag to move' } });
	setIconSafe(grip, 'grip-vertical');
	setIconSafe(h.createSpan({ cls: 'afm-section-icon' }), x.icon);
	h.createSpan({ cls: 'afm-section-name', text: x.name });

	// Width: full, or half so two sit side by side (saved in settings).
	const half = s.halfSections.includes(x.id);
	wrap.toggleClass('is-half', half);
	const width = h.createSpan({ cls: 'afm-width-button clickable-icon', attr: { 'aria-label': half ? 'Full width' : 'Half width (side by side)', role: 'button' } });
	setIconSafe(width, half ? 'rectangle-horizontal' : 'columns-2');
	width.addEventListener('click', (e) => {
		e.stopPropagation(); // don't collapse
		s.halfSections = half ? s.halfSections.filter((id) => id !== x.id) : [...s.halfSections, x.id];
		ctx.saveSettings();
	});
	setIconSafe(h.createSpan({ cls: 'afm-chevron' }), 'chevron-right'); // CSS turns it down when open

	// Collapse: click, Enter or Space on the title. Remembered in settings.
	const toggle = () => {
		s.collapsedSections = collapsed ? s.collapsedSections.filter((id) => id !== x.id) : [...s.collapsedSections, x.id];
		ctx.saveSettings();
	};
	h.addEventListener('click', toggle);
	h.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		toggle();
	});

	// Move: only the grip starts a drag, so text inside stays selectable.
	grip.addEventListener('click', (e) => e.stopPropagation());
	grip.addEventListener('mousedown', () => {
		wrap.draggable = true;
		window.addEventListener('mouseup', () => (wrap.draggable = false), { once: true });
	});
	wrap.addEventListener('dragstart', (e) => {
		dragging = x.id;
		e.dataTransfer?.setData(DRAG_TYPE, x.id);
		wrap.addClass('is-dragging');
	});
	wrap.addEventListener('dragend', () => {
		dragging = '';
		wrap.draggable = false;
		wrap.removeClass('is-dragging');
	});

	// Drop on another section: top half = before it, bottom half = after it.
	const after = (e: DragEvent) => e.clientY > wrap.getBoundingClientRect().top + wrap.offsetHeight / 2;
	const clear = () => wrap.removeClasses(['is-drop-before', 'is-drop-after']);
	wrap.addEventListener('dragover', (e) => {
		if (!dragging || dragging === x.id) return;
		e.preventDefault();
		wrap.toggleClass('is-drop-before', !after(e));
		wrap.toggleClass('is-drop-after', after(e));
	});
	wrap.addEventListener('dragleave', (e) => { if (!wrap.contains(e.relatedTarget as Node)) clear(); });
	wrap.addEventListener('drop', (e) => {
		clear();
		if (!dragging || dragging === x.id) return;
		e.preventDefault();
		s.sectionOrder = moveSection(s.sectionOrder, dragging, x.id, after(e));
		const side = ctx.columns[x.id];
		if (side) place(ctx, dragging, side); // dropped on a half-width section: joins its column
		ctx.saveSettings();
	});

	return collapsed ? null : wrap.createDiv({ cls: 'afm-section-body' });
}

// Empty space under a column of half-width sections takes a drop too: the section goes to the end of that column.
// `band` = ids of the half-width sections in this run, in page order (filled while drawing).
export function columnDrop(col: HTMLElement, side: 'left' | 'right', band: string[], ctx: DashboardContext): void {
	const s = ctx.settings;
	col.addEventListener('dragover', (e) => {
		if (!dragging || e.target !== col) return; // over a section: its own handler decides
		e.preventDefault();
		col.addClass('is-drop');
	});
	col.addEventListener('dragleave', (e) => { if (e.target === col) col.removeClass('is-drop'); });
	col.addEventListener('drop', (e) => {
		col.removeClass('is-drop');
		if (!dragging || e.target !== col) return;
		e.preventDefault();
		const others = band.filter((id) => id !== dragging);
		const last = [...others].reverse().find((id) => ctx.columns[id] === side) ?? others[others.length - 1];
		if (last) s.sectionOrder = moveSection(s.sectionOrder, dragging, last, true);
		place(ctx, dragging, side);
		ctx.saveSettings();
	});
}

// Makes `id` a half-width section in column `side`, and saves where every other one is now, so none moves.
function place(ctx: DashboardContext, id: string, side: 'left' | 'right'): void {
	const s = ctx.settings;
	s.sectionColumns = { ...s.sectionColumns, ...ctx.columns, [id]: side };
	if (!s.halfSections.includes(id)) s.halfSections = [...s.halfSections, id];
}
