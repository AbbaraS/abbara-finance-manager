import { Setting } from 'obsidian';
import type { SettingsContext } from '../context';

// Which accounts can have income. Money in anywhere else is never income.
export function incomeSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el)
		.setName('Income accounts')
		.setDesc('Money in on these accounts counts as income, unless its category says otherwise.')
		.setHeading();

	const accounts = [...new Set([...ctx.accounts, ...s.incomeAccounts])].sort();
	if (accounts.length === 0) el.createDiv({ cls: 'setting-item-description', text: 'No accounts found in the data folder yet.' });
	for (const account of accounts) {
		new Setting(el).setName(account).addToggle((t) => t
			.setValue(s.incomeAccounts.includes(account))
			.onChange((on) => {
				s.incomeAccounts = s.incomeAccounts.filter((a) => a !== account);
				if (on) s.incomeAccounts.push(account);
				ctx.save();
			}));
	}
}
