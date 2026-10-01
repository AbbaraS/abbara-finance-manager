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
		ctx.saveSettings();
	});

	return collapsed ? null : wrap.createDiv({ cls: 'afm-section-body' });
}
