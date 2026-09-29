import { setIconSafe } from '../look/setIconSafe';

// A transaction's note, with a speech-bubble icon. Nothing when empty.
export function noteLine(parent: HTMLElement, note: string): void {
	if (!note) return;
	const line = parent.createDiv({ cls: 'afm-note-line' });
	setIconSafe(line.createSpan({ cls: 'afm-note-icon' }), 'message-square');
	line.createSpan({ text: note });
}
