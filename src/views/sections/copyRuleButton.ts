import { Menu, Notice, setIcon } from 'obsidian';
import { csvField } from '../../utils/csvField';

// Icon button: pick a category, then copy "pattern,category,," for category_patterns.csv.
export function copyRuleButton(parent: HTMLElement, pattern: string, categories: string[]): void {
	const btn = parent.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': `Copy rule for "${pattern}"` } });
	setIcon(btn, 'clipboard-copy');

	btn.addEventListener('click', (e) => {
		e.stopPropagation(); // don't trigger clicks on the row
		const menu = new Menu();
		for (const category of categories) {
			menu.addItem((item) => item.setTitle(category).onClick(() => copyRule(pattern, category)));
		}
		menu.showAtMouseEvent(e);
	});
}

// Writes the rule to the clipboard and confirms with a notice.
async function copyRule(pattern: string, category: string): Promise<void> {
	const line = `${csvField(pattern)},${csvField(category)},,`;
	await navigator.clipboard.writeText(line);
	new Notice(`Copied: ${line}`);
}
