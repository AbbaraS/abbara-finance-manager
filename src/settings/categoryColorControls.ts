import type { DropdownComponent, Setting } from 'obsidian';
import type { Category } from '../models/Category';
import { COLOR_HEX, COLOR_NAMES, isColorName } from '../models/colors';

// Colour dropdown (named colours + Custom) and a picker for a custom hex. `changed` runs after each edit.
export function categoryColorControls(setting: Setting, c: Category, changed: () => void): void {
	let dropdown: DropdownComponent;
	setting
		.addDropdown((d) => {
			dropdown = d;
			for (const name of COLOR_NAMES) d.addOption(name, name[0].toUpperCase() + name.slice(1));
			d.addOption('custom', 'Custom');
			d.setValue(isColorName(c.color) ? c.color : 'custom');
		})
		.addColorPicker((p) => {
			p.setValue(isColorName(c.color) ? COLOR_HEX[c.color] : c.color || COLOR_HEX.gray);
			p.onChange((hex) => { c.color = hex; dropdown.setValue('custom'); changed(); });
			dropdown.onChange((v) => {
				if (v === 'custom') return;
				c.color = v;
				p.setValue(COLOR_HEX[v as keyof typeof COLOR_HEX]);
				changed();
			});
		});
}
