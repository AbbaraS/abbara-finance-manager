import { setIconSafe } from '../look/setIconSafe';

// Adds a titled section with an icon and returns its body to draw into.
export function section(parent: HTMLElement, title: string, icon: string): HTMLElement {
	const wrap = parent.createDiv({ cls: 'afm-section' });
	const h = wrap.createEl('h2', { cls: 'afm-section-title' });
	setIconSafe(h.createSpan({ cls: 'afm-section-icon' }), icon);
	h.createSpan({ text: title });
	return wrap.createDiv({ cls: 'afm-section-body' });
}
