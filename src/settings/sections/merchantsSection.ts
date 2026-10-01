import { Setting } from 'obsidian';
import type { Direction, Rule } from '../../models/Rule';
import { ruleHits } from '../../models/ruleHits';
import { cleanPatterns } from '../../models/ruleMatches';
import { countLabel } from '../../utils/countLabel';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Labels for the direction dropdown.
const DIRECTIONS: Record<Direction, string> = { '': 'In or out', in: 'Money in', out: 'Money out' };

// Merchant memory: the rules saved by "Remember for this merchant", collapsed, with a filter and edit fields.
export function merchantsSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	new Setting(el)
		.setName('Merchants')
		.setDesc('Saved from the edit window. Each merchant can have several spellings, one per line. Checked top to bottom; the first match sets the category. One-off edits beat these.')
		.setHeading();

	// Collapsed list, so it doesn't push the rest of the page down.
	const list = el.createEl('details', { cls: 'afm-edits' });
	list.createEl('summary', { text: `Show ${countLabel(labels.rules.length, 'merchant')}` });

	// Filter + add.
	const rows: { el: HTMLElement; text: string }[] = [];
	new Setting(list)
		.addSearch((q) => q.setPlaceholder('Filter merchants').onChange((v) => {
			const f = v.trim().toLowerCase();
			rows.forEach((r) => r.el.toggleClass('afm-hidden', !r.text.includes(f)));
		}))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			labels.rules.unshift({ patterns: [], category: labels.categories[0]?.name ?? '', subcategory: '', account: '', direction: '' });
			ctx.saveAndRedraw();
		}));

	const hits = ruleHits(ctx.rows, labels);
	labels.rules.forEach((rule, i) => {
		const row = ruleRow(list, rule, i, hits[i], ctx);
		rows.push({ el: row, text: `${rule.patterns.join(' ')} ${rule.category} ${rule.subcategory ?? ''} ${rule.account}`.toLowerCase() });
	});
}

// One rule: patterns (one per line), category, subcategory, account, direction, then up / down / delete.
function ruleRow(el: HTMLElement, rule: Rule, i: number, hits: number, ctx: SettingsContext): HTMLElement {
	const rules = ctx.plugin.db.labels.rules;
	const accounts = [...new Set([...ctx.accounts, rule.account])].filter(Boolean);
	const setting = new Setting(el)
		.setClass('afm-wrap')
		.setName(`${i + 1}.`)
		.setDesc(rule.patterns.some((p) => p.trim()) ? `Used for ${countLabel(hits)}` : 'Empty: matches nothing')
		.addTextArea((t) => {
			t.setPlaceholder('Description contains\n(one per line)').setValue(rule.patterns.join('\n'))
				.onChange((v) => { rule.patterns = cleanPatterns(v.split('\n')); ctx.save(); });
			t.inputEl.rows = Math.min(Math.max(rule.patterns.length, 1), 5);
		})
		.addDropdown((d) => {
			for (const c of ctx.plugin.db.labels.categories) d.addOption(c.name, c.name);
			d.setValue(rule.category).onChange((v) => { rule.category = v; ctx.save(); });
		})
		.addText((t) => t.setPlaceholder('Subcategory').setValue(rule.subcategory ?? '')
			.onChange((v) => { rule.subcategory = v.trim(); ctx.save(); }))
		.addDropdown((d) => {
			d.addOption('', 'Any account');
			for (const a of accounts) d.addOption(a, a);
			d.setValue(rule.account).onChange((v) => { rule.account = v; ctx.save(); });
		})
		.addDropdown((d) => d.addOptions(DIRECTIONS).setValue(rule.direction)
			.onChange((v) => { rule.direction = v as Direction; ctx.save(); }))
		.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0)
			.onClick(() => move(rules, i, -1, ctx)))
		.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === rules.length - 1)
			.onClick(() => move(rules, i, 1, ctx)));
	confirmDelete(setting, 'Forget merchant', () => {
		rules.splice(i, 1);
		ctx.saveAndRedraw();
	});
	return setting.settingEl;
}

// Swaps a rule with its neighbour.
function move(rules: Rule[], i: number, step: number, ctx: SettingsContext): void {
	const j = i + step;
	if (j < 0 || j >= rules.length) return;
	[rules[i], rules[j]] = [rules[j], rules[i]];
	ctx.saveAndRedraw();
}
