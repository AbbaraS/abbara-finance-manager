import { Notice, Setting } from 'obsidian';
import { cleanPatterns } from '../../models/counterpartyMatches';
import { deletePerson, movePerson, renamePerson } from '../../models/people';
import { countLabel } from '../../utils/countLabel';
import { confirmDelete } from '../confirmDelete';
import type { SettingsContext } from '../context';
import { subcategoryList } from './subcategoryList';

// People under your People categories: rename, move, spellings, delete, and each person's own subcategories.
export function peopleSection(el: HTMLElement, ctx: SettingsContext): void {
	const labels = ctx.plugin.db.labels;
	const homes = labels.categories.filter((c) => c.kind === 'people').map((c) => c.name);
	new Setting(el)
		.setName('People')
		.setDesc('Each person is found by their spellings, one per line (checked before counterparties), and has their own subcategories, e.g. Mum: Allowance. New people and spellings can also be added from the edit window.')
		.setHeading();
	if (homes.length === 0) return void el.createDiv({ cls: 'afm-note', text: 'Make a category of the People kind first.' });

	const people = [...labels.people].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
	for (const p of people) {
		const used = ctx.rows.filter((t) => t.person === p.name).length;
		const row = new Setting(el).setClass('afm-wrap').setName(p.name).setDesc(countLabel(used))
			.addText((t) => {
				t.setValue(p.name);
				t.inputEl.addEventListener('change', () => { // on Enter / leaving the field
					const to = t.getValue().trim();
					if (!to || to === p.name) return t.setValue(p.name);
					if (labels.people.some((x) => x.name === to)) { new Notice(`"${to}" already exists.`); return t.setValue(p.name); }
					renamePerson(labels, p.name, to);
					ctx.saveAndRedraw();
				});
			})
			.addDropdown((d) => {
				for (const h of homes) d.addOption(h, h);
				d.setValue(p.category).onChange((v) => { movePerson(labels, p.name, v); ctx.saveAndRedraw(); });
			})
			.addTextArea((t) => {
				t.setPlaceholder('Description contains\n(one per line)').setValue((p.patterns ?? []).join('\n'))
					.onChange((v) => { p.patterns = cleanPatterns(v.split('\n')); ctx.save(); });
				t.inputEl.rows = Math.min(Math.max(p.patterns?.length ?? 1, 1), 4);
			});
		confirmDelete(row, 'Delete person, their subcategories and debts (transactions keep the category)', () => {
			deletePerson(labels, p.name);
			ctx.saveAndRedraw();
		});
		subcategoryList(el, ctx, p.category, p.name);
	}

	// Add.
	let name = '';
	let home = homes[0];
	new Setting(el)
		.addText((t) => t.setPlaceholder('New person').onChange((v) => (name = v.trim())))
		.addDropdown((d) => {
			for (const h of homes) d.addOption(h, h);
			d.setValue(home).onChange((v) => (home = v));
		})
		.addButton((b) => b.setButtonText('Add').onClick(() => {
			if (!name) return;
			if (labels.people.some((x) => x.name === name)) return void new Notice(`"${name}" already exists.`);
			labels.people.push({ name, category: home });
			ctx.saveAndRedraw();
		}));
}
