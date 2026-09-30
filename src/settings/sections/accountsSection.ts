import { Notice, Setting } from 'obsidian';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Your accounts: the ones in the data plus ones you add (no statements yet), each with optional match text.
export function accountsSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.labels.data;
	new Setting(el)
		.setName('Accounts')
		.setDesc('Match text: words in a transfer\'s description that mean this account (e.g. a sort code), so it isn\'t "Unknown account". Name added accounts the way myFinances will, so their statements link up later.')
		.setHeading();

	const inData = new Set(ctx.rows.map((t) => t.account));
	for (const name of ctx.accounts) {
		const saved = labels.accounts.find((a) => a.name === name);
		const row = new Setting(el).setName(name).setDesc(inData.has(name) ? 'Has statements' : 'Added, no statements yet');
		row.addText((t) => t.setPlaceholder('Match text').setValue(saved?.match ?? '').onChange((v) => {
			const a = labels.accounts.find((x) => x.name === name);
			if (a) a.match = v;
			else labels.accounts.push({ name, match: v });
			ctx.save();
		}));
		if (inData.has(name)) continue;
		confirmDelete(row, 'Remove account', () => {
			labels.accounts = labels.accounts.filter((a) => a.name !== name);
			ctx.saveAndRedraw();
		});
	}

	// Add.
	let name = '';
	new Setting(el)
		.addText((t) => t.setPlaceholder('New account, e.g. barclays - savings').onChange((v) => (name = v.trim())))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (ctx.accounts.includes(name)) return void new Notice(`"${name}" already exists.`);
			labels.accounts.push({ name, match: '' });
			ctx.saveAndRedraw();
		}));
}
