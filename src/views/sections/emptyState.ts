
// Shown when there are no transactions: the database can't be read or has no rows yet.
export function emptyState(el: HTMLElement, db: { error: string; file: string }): void {
	const box = el.createDiv({ cls: 'afm-empty' });
	box.createEl('h2', { text: 'No data found' });
	box.createEl('p', { text: db.error || `No transactions in ${db.file}.` });
	box.createEl('p', {
		text: 'Run make in myFinances, then set the database file in settings (e.g. ~/source/myFinances/data/finance.db).',
	});
}
