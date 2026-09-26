import { setIcon } from 'obsidian';

// Makes `row` show and hide `details` on click, Enter or Space. `icon` gets a chevron.
export function expandable(row: HTMLElement, icon: HTMLElement, details: HTMLElement[]): void {
	let open = false;
	setIcon(icon, 'chevron-right'); // CSS rotates it when open
	row.addClass('afm-expandable');
	row.setAttrs({ tabindex: '0', 'aria-expanded': 'false' });
	details.forEach((d) => d.addClass('afm-hidden'));

	// Flip state, then let classes do the rest.
	const toggle = () => {
		open = !open;
		row.toggleClass('is-open', open);
		row.setAttr('aria-expanded', String(open));
		details.forEach((d) => d.toggleClass('afm-hidden', !open));
	};

	row.addEventListener('click', toggle);
	row.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault(); // stop Space scrolling the page
		toggle();
	});
}
