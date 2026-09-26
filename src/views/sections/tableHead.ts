// One table column: header text and an optional class (e.g. 'afm-num').
export interface Column {
	text: string;
	cls?: string;
}

// Adds the <thead> row. Shared by every table so headers look the same.
export function tableHead(table: HTMLTableElement, columns: Column[]): void {
	const tr = table.createEl('thead').createEl('tr');
	for (const c of columns) tr.createEl('th', { text: c.text, cls: c.cls });
}
