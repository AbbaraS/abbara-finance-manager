import type { Setting } from 'obsidian';

// A delete button that needs a second click within 3 seconds.
export function confirmDelete(setting: Setting, tooltip: string, onConfirm: () => void): void {
	setting.addExtraButton((b) => {
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
	});
}
