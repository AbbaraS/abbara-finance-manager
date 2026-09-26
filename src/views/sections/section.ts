// Adds a titled section and returns its body to draw into.
export function section(parent: HTMLElement, title: string): HTMLElement {
	const wrap = parent.createDiv({ cls: 'afm-section' });
	wrap.createEl('h2', { cls: 'afm-section-title', text: title });
	return wrap.createDiv({ cls: 'afm-section-body' });
}
