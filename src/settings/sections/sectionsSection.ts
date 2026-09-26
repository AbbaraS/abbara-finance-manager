import { Setting } from 'obsidian';
import { SECTIONS } from '../../models/sections';
import type { SettingsContext } from '../context';

// One toggle per dashboard section.
export function sectionsSection(el: HTMLElement, ctx: SettingsContext): void {
	const s = ctx.plugin.settings;
	new Setting(el).setName('Dashboard sections').setHeading();

	for (const section of SECTIONS) {
		new Setting(el).setName(section.name).addToggle((t) => t
			.setValue(!s.hiddenSections.includes(section.id))
			.onChange((show) => {
				s.hiddenSections = s.hiddenSections.filter((id) => id !== section.id);
				if (!show) s.hiddenSections.push(section.id);
				ctx.save();
			}));
	}
}
