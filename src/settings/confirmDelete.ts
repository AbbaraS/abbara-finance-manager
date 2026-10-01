import { ExtraButtonComponent, Setting } from 'obsidian';

// A delete button (on a Setting row or in any element) that needs a second click within 3 seconds.
export function confirmDelete(target: Setting | HTMLElement, tooltip: string, onConfirm: () => void): void {
	const b = target instanceof Setting ? lastExtraButton(target) : new ExtraButtonComponent(target);
	let armed = false;
	const reset = () => {
		armed = false;
		b.setIcon('trash-2').setTooltip(tooltip);
		b.extraSettingsEl.removeClass('mod-warning');
	};
	reset();
	b.onClick(() => {
		if (armed) return onConfirm();
		armed = true;
		b.setIcon('check').setTooltip('Click again to delete');
		b.extraSettingsEl.addClass('mod-warning');
		window.setTimeout(reset, 3000);
	});
}

// Adds an extra button to a Setting row and returns it.
function lastExtraButton(setting: Setting): ExtraButtonComponent {
	let button!: ExtraButtonComponent;
	setting.addExtraButton((b) => (button = b));
	return button;
}
