import { Setting } from 'obsidian';
import type { SettingsContext } from '../context';

// Where the CSVs are and how money is shown.
export function dataSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el).setName('Data').setHeading();

	new Setting(el)
		.setName('Data folder')
		.setDesc('Vault folder with the monthly CSVs (the symlinked myFinances/data/combined).')
		.addText((t) => t.setPlaceholder('Finance/combined').setValue(s.dataFolder)
			.onChange((v) => { s.dataFolder = v.trim().replace(/\/+$/, ''); ctx.save(); }));

	new Setting(el)
		.setName('Labels file')
		.setDesc('Vault JSON file with your categories per transaction, notes and merchants. Back it up with your vault.')
		.addText((t) => {
			t.setPlaceholder('Finance/labels.json').setValue(s.labelsFile);
			// Only on Enter / leaving the field, so half-typed paths never get a file.
			t.inputEl.addEventListener('change', async () => {
				s.labelsFile = t.getValue().trim() || 'Finance/labels.json';
				await ctx.plugin.labels.switchFile();
				ctx.saveAndRedraw();
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
