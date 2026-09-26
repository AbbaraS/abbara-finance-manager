import { countLabel } from '../../utils/countLabel';

// Hides rows after the first `limit` and adds a button to reveal them.
export function showMore(parent: HTMLElement, rows: HTMLElement[], limit: number): void {
	const extra = rows.slice(limit);
	if (extra.length === 0) return;
	extra.forEach((r) => r.addClass('afm-hidden'));

	const btn = parent.createEl('button', { cls: 'afm-show-more', text: `Show ${countLabel(extra.length, 'more row')}` });
	btn.addEventListener('click', () => {
		extra.forEach((r) => r.removeClass('afm-hidden'));
		btn.remove();
	});
}
