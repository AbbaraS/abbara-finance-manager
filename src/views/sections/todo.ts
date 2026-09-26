// Placeholder for a section you haven't built yet: shows the lesson and a peek at its data.
export function todo(body: HTMLElement, lesson: string, data: unknown[]): void {
	const box = body.createDiv({ cls: 'afm-todo' });
	box.createDiv({ cls: 'afm-todo-title', text: `To build: ${lesson}` });
	box.createEl('pre', { cls: 'afm-todo-data', text: JSON.stringify(data.slice(0, 3), null, 2) });
	if (data.length > 3) box.createDiv({ cls: 'afm-muted', text: `…and ${data.length - 3} more` });
}
