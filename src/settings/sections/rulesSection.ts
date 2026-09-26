import { Setting } from 'obsidian';
import { categoryNames } from '../../models/categoryNames';
import type { Direction, Rule } from '../../models/Rule';
import { ruleHits } from '../../models/ruleHits';
import { countLabel } from '../../utils/countLabel';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';

// Labels for the direction dropdown.
const DIRECTIONS: Record<Direction, string> = { '': 'In or out', in: 'Money in', out: 'Money out' };

// Every rule in order (first match wins), with a filter, edit fields and move/delete buttons.
export function rulesSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el)
		.setName('Rules')
		.setDesc('Checked top to bottom; the first match sets the category. One-off edits beat rules. Add rules from the dashboard or here.')
		.setHeading();

	// Filter + add.
	const rows: { el: HTMLElement; text: string }[] = [];
	new Setting(el)
		.addSearch((q) => q.setPlaceholder('Filter rules').onChange((v) => {
			const f = v.trim().toLowerCase();
			rows.forEach((r) => r.el.toggleClass('afm-hidden', !r.text.includes(f)));
		}))
		.addButton((b) => b.setButtonText('Add rule').onClick(() => {
			s.rules.unshift({ pattern: '', category: categoryNames(s)[0] ?? '', account: '', direction: '' });
			ctx.saveAndRedraw();
		}));
	if (s.rules.length === 0) el.createDiv({ cls: 'setting-item-description', text: 'No rules yet.' });

	const hits = ruleHits(ctx.rows, s);
	s.rules.forEach((rule, i) => {
		const row = ruleRow(el, rule, i, hits[i], ctx);
		rows.push({ el: row, text: `${rule.pattern} ${rule.category} ${rule.account}`.toLowerCase() });
	});
}

// One rule: pattern, category, account, direction, then up / down / delete.
function ruleRow(el: HTMLElement, rule: Rule, i: number, hits: number, ctx: SettingsContext): HTMLElement {
	const s = ctx.plugin.settings;
	const accounts = [...new Set([...ctx.accounts, rule.account])].filter(Boolean);
	const setting = new Setting(el)
		.setClass('afm-rule')
		.setName(`${i + 1}.`)
		.setDesc(rule.pattern.trim() ? `Used for ${countLabel(hits)}` : 'Empty: matches nothing')
		.addText((t) => t.setPlaceholder('Description contains').setValue(rule.pattern)
			.onChange((v) => { rule.pattern = v; ctx.save(); }))
		.addDropdown((d) => {
			for (const name of categoryNames(s)) d.addOption(name, name);
			d.setValue(rule.category).onChange((v) => { rule.category = v; ctx.save(); });
		})
		.addDropdown((d) => {
			d.addOption('', 'Any account');
			for (const a of accounts) d.addOption(a, a);
			d.setValue(rule.account).onChange((v) => { rule.account = v; ctx.save(); });
		})
		.addDropdown((d) => d.addOptions(DIRECTIONS).setValue(rule.direction)
			.onChange((v) => { rule.direction = v as Direction; ctx.save(); }))
		.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0)
			.onClick(() => move(s.rules, i, -1, ctx)))
		.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === s.rules.length - 1)
			.onClick(() => move(s.rules, i, 1, ctx)));
	confirmDelete(setting, 'Delete rule', () => {
		s.rules.splice(i, 1);
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
