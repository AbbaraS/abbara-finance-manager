import { Setting } from 'obsidian';
import { moveSection, orderedSections } from '../../models/sections';
import type { SettingsContext } from '../context';

// Dashboard sections in page order: shown or not, full or half width (two side by side), and up / down to move them.
export function sectionsSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el).setName('Dashboard sections').setDesc('Shown in this order. Half-width sections sit side by side when the window is wide enough. On the dashboard you can also drag a section by its grip, switch its width, and click its title to collapse it.').setHeading();

	const list = orderedSections(s.sectionOrder);
	list.forEach((section, i) => {
		const move = (to: number) => {
			s.sectionOrder = moveSection(s.sectionOrder, section.id, list[to].id, to > i);
			ctx.saveAndRedraw();
		};
		const half = s.halfSections.includes(section.id);
		new Setting(el)
			.setName(section.name)
			.addDropdown((d) => d.addOptions({ full: 'Full width', left: 'Half · left column', right: 'Half · right column' })
				.setValue(half ? s.sectionColumns[section.id] ?? 'left' : 'full').onChange((v) => {
					s.halfSections = [...s.halfSections.filter((id) => id !== section.id), ...(v === 'full' ? [] : [section.id])];
					if (v !== 'full') s.sectionColumns = { ...s.sectionColumns, [section.id]: v as 'left' | 'right' };
					ctx.save();
				}))
			.addExtraButton((b) => b.setIcon('arrow-up').setTooltip('Move up').setDisabled(i === 0).onClick(() => move(i - 1)))
			.addExtraButton((b) => b.setIcon('arrow-down').setTooltip('Move down').setDisabled(i === list.length - 1).onClick(() => move(i + 1)))
			.addToggle((t) => t
				.setValue(!s.hiddenSections.includes(section.id))
				.onChange((show) => {
					s.hiddenSections = s.hiddenSections.filter((id) => id !== section.id);
					if (!show) s.hiddenSections.push(section.id);
					ctx.save();
				}));
	});
}
