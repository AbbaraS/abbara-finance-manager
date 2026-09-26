import { Setting } from 'obsidian';
import type { SettingsContext } from '../context';

// Which categories count as income and which are left out.
export function categoriesSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el).setName('Categories').setHeading();

	new Setting(el)
		.setName('Income categories')
		.setDesc('Comma separated. Money in here is income; money in other categories is a refund.')
		.addText((t) => t.setValue(s.incomeCategories.join(', '))
			.onChange((v) => { s.incomeCategories = splitList(v); ctx.save(); }));

	new Setting(el)
		.setName('Ignored categories')
		.setDesc('Comma separated. Left out of every total, like transfers.')
		.addText((t) => t.setValue(s.ignoreCategories.join(', '))
			.onChange((v) => { s.ignoreCategories = splitList(v); ctx.save(); }));
}

// "a, b ,c" -> ["a", "b", "c"].
function splitList(text: string): string[] {
	return text.split(',').map((x) => x.trim()).filter(Boolean);
}
