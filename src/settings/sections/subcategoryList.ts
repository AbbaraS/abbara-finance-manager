import { ButtonComponent, ExtraButtonComponent, Notice, TextComponent } from 'obsidian';
import { addSubcategory, deleteSubcategory, renameSubcategory, subcategoriesOf } from '../../models/categories';
import type { Subcategory } from '../../models/Category';
import { moveSubcategory, placeChoices } from '../../models/restructure';
import { collapsible } from '../collapsible';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';
import { MoveModal } from '../MoveModal';

// A category's subcategories (a person's own under People), collapsed into a compact grid: rename, move, delete, add.
export function subcategoryList(el: HTMLElement, ctx: SettingsContext, parent: string, person = ''): void {
	const labels = ctx.plugin.db.labels;
	const subs = subcategoriesOf(labels, parent, person);
	const names = subs.map((s) => s.name).join(', ');
	const box = collapsible(el, ctx, `subs:${parent}:${person}`, subs.length ? `Subcategories: ${names}` : 'No subcategories');
	box.addClass('afm-subs');

	const grid = box.createDiv({ cls: 'afm-sub-grid' });
	for (const s of subs) {
		const item = grid.createDiv({ cls: 'afm-sub' });
		const text = new TextComponent(item).setValue(s.name);
		text.inputEl.addEventListener('change', () => { // on Enter / leaving the field
			const to = text.getValue().trim();
			if (!to || to === s.name) return text.setValue(s.name);
			if (subs.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return text.setValue(s.name); }
			renameSubcategory(labels, s, to);
			ctx.saveAndRedraw();
		});
		const used = ctx.rows.filter((t) => t.category === parent && t.subcategory === s.name && t.person === person).length;
		item.createSpan({ cls: 'afm-sub-count', text: String(used), attr: { 'aria-label': `${used} transactions` } });

		// A person's subcategories just delete; others can move, merge or delete into somewhere else.
		if (person) {
			confirmDelete(item, 'Delete subcategory (its transactions keep the category)', () => {
				deleteSubcategory(labels, s);
				ctx.saveAndRedraw();
			});
			continue;
		}
		new ExtraButtonComponent(item).setIcon('folder-input').setTooltip('Move or merge').onClick(() => moveWindow(ctx, s, used));
		new ExtraButtonComponent(item).setIcon('trash-2').setTooltip('Delete subcategory').onClick(() => moveWindow(ctx, s, used, true));
	}

	// Add (button or Enter).
	const add = box.createDiv({ cls: 'afm-sub-add' });
	const input = new TextComponent(add).setPlaceholder('New subcategory');
	const addIt = () => {
		const name = input.getValue().trim();
		if (!name) return;
		if (subs.some((x) => x.name === name)) return void new Notice(`"${name}" already exists.`);
		addSubcategory(labels, parent, name, person);
		ctx.saveAndRedraw();
	};
	input.inputEl.addEventListener('keydown', (e) => e.key === 'Enter' && addIt());
	new ButtonComponent(add).setButtonText('Add').onClick(addIt);
}

// Asks where a subcategory's transactions and counterparties go, then moves it there (or deletes it: same move, other wording).
// Moving offers its own category and new subcategories of its name; deleting starts on the parent, no subcategory.
function moveWindow(ctx: SettingsContext, s: Subcategory, used: number, del = false): void {
	const labels = ctx.plugin.db.labels;
	const own = del || labels.categories.some((c) => c.name === s.name) ? [] : [{ label: `Its own category "${s.name}"`, place: { category: s.name, sub: '' } }];
	const choices = [...own, ...placeChoices(labels, { category: s.parent, sub: s.name }, del ? '' : s.name)];
	new MoveModal(ctx.app, {
		title: `${del ? 'Delete' : 'Move'} ${s.parent} › ${s.name}`,
		desc: del
			? `${used} transactions use it. Keep them in ${s.parent} without a subcategory, or move them somewhere else.`
			: `Its ${used} transactions and counterparties go with it. Pick a subcategory to merge into, or a category to drop the subcategory.`,
		button: del ? 'Delete' : 'Move',
		warning: del,
		choices,
		start: del ? Math.max(0, choices.findIndex((c) => c.place?.category === s.parent && !c.place.sub)) : 0,
		onDone: (place) => {
			if (!place) return;
			moveSubcategory(labels, ctx.plugin.db.rows, s, place);
			ctx.saveAndRedraw();
		},
	}).open();
}
