import { Setting } from 'obsidian';
import type { SettingsContext } from '../context';

// Where the database is and how money is shown.
export function dataSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el).setName('Data').setHeading();

	new Setting(el)
		.setName('Database file')
		.setDesc('The finance.db made by myFinances (transactions, categories, merchants and your labels): a full path, ~/... or a path inside the vault.')
		.addText((t) => {
			t.setPlaceholder('~/source/myFinances/data/finance.db').setValue(s.dbFile);
			// Only on Enter / leaving the field, so half-typed paths aren't opened.
			t.inputEl.addEventListener('change', async () => {
				s.dbFile = t.getValue().trim();
				await ctx.plugin.saveData(s);
				await ctx.plugin.openDatabase();
				ctx.redraw();
			});
		});

	new Setting(el)
		.setName('Currency')
		.setDesc('Only rows in this currency are counted (ISO code, e.g. GBP).')
		.addText((t) => t.setValue(s.currency)
			.onChange((v) => { s.currency = v.trim().toUpperCase(); ctx.save(); }));

	new Setting(el)
		.setName('Locale')
		.setDesc('Number and month format, e.g. en-GB.')
		.addText((t) => t.setValue(s.locale)
			.onChange((v) => { s.locale = v.trim() || 'en-GB'; ctx.save(); }));
}
