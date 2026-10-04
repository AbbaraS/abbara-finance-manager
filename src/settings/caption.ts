import type { Setting } from 'obsidian';

// Puts a small caption above the control just added to `setting`, so its fields can be told apart.
export function caption(setting: Setting, text: string): Setting {
	const control = setting.controlEl.lastElementChild;
	if (control) wrap(setting.controlEl, control, text);
	return setting;
}

// Captions for every control so far, in order.
export function captions(setting: Setting, texts: string[]): Setting {
	const controls = Array.from(setting.controlEl.children);
	texts.forEach((text, i) => controls[i] && wrap(setting.controlEl, controls[i], text));
	return setting;
}

// Moves `control` into a box with `text` above it.
function wrap(parent: HTMLElement, control: Element, text: string): void {
	const box = document.createElement('div');
	box.addClass('afm-field');
	parent.insertBefore(box, control);
	box.createDiv({ cls: 'afm-field-label', text });
	box.appendChild(control);
}
