import { Notice, Setting } from 'obsidian';
import { KIND_ICONS, KIND_LABELS, type Category, type CategoryKind } from '../../models/Category';
import { categoryUsage } from '../../models/categoryUsage';
import { deleteCategory } from '../../models/deleteCategory';
import { leastUsedColor } from '../../models/migrateSettings';
import { renameCategory } from '../../models/renameCategory';
import { countLabel } from '../../utils/countLabel';
import { badge } from '../../views/look/badge';
import { categoryColorControls } from '../categoryColorControls';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';
import { IconSuggestModal } from '../IconSuggestModal';

// Your categories: badge preview, icon, name, colour, how each counts, delete; add new ones below.
export function categoriesSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el)
		.setName('Categories')
		.setDesc('Spending: money out is spent, money in is a refund. Income: money in on an income account. Investment: shown in the Invested card. Transfer: moves between your accounts. Not counted: left out of everything.')
		.setHeading();

	// Grouped by kind, then A-Z.
	const order = Object.keys(KIND_LABELS);
	const sorted = [...s.categories].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
	for (const c of sorted) categoryRow(el, c, ctx);

	// Add.
	let name = '';
	new Setting(el)
		.addText((t) => t.setPlaceholder('New category').onChange((v) => (name = v.trim())))
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (s.categories.some((c) => c.name === name)) return void new Notice(`"${name}" already exists.`);
			s.categories.push({ name, kind: 'spending', color: leastUsedColor(s), icon: '' });
			ctx.saveAndRedraw();
		}));
}

// One category row.
function categoryRow(el: HTMLElement, c: Category, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	const use = categoryUsage(c.name, s, ctx.rows);
	const setting = new Setting(el)
		.setClass('afm-wrap')
		.setDesc(`${countLabel(use.rows)} · ${countLabel(use.rules, 'rule')} · ${countLabel(use.edits, 'one-off edit')}`);

	// Live badge preview as the row's name.
	const preview = () => { setting.nameEl.empty(); badge(setting.nameEl, c.name, s); };
	preview();

	setting
		.addButton((b) => b.setIcon(c.icon || KIND_ICONS[c.kind]).setTooltip('Change icon')
			.onClick(() => new IconSuggestModal(ctx.app, (id) => { c.icon = id; ctx.saveAndRedraw(); }).open()))
		.addText((t) => {
			t.setValue(c.name);
			t.inputEl.addEventListener('change', () => {
				const to = t.getValue().trim();
				if (!to || to === c.name) return t.setValue(c.name);
				if (s.categories.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(c.name); }
				renameCategory(s, c.name, to);
				ctx.saveAndRedraw();
			});
		});
	categoryColorControls(setting, c, () => { preview(); ctx.save(); });
	setting.addDropdown((d) => d.addOptions(KIND_LABELS).setValue(c.kind)
		.onChange((v) => { c.kind = v as CategoryKind; preview(); ctx.save(); }));
	confirmDelete(setting, 'Delete category, its rules and edits', () => {
		deleteCategory(s, c.name);
		ctx.saveAndRedraw();
	});
}
