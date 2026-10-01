import { setIcon } from 'obsidian';

// Makes `row` show and hide `details` on click, Enter or Space. `icon` gets a chevron.
// `open` remembers open rows by `id`, so they stay open after a redraw. While `shown` is false (a parent row is closed)
// the details stay hidden too. `onToggle` runs after each click. Returns a function that redraws the state.
export function expandable(row: HTMLElement, icon: HTMLElement, details: HTMLElement[], id: string, open: Set<string>,
	shown = () => true, onToggle = () => {}): () => void {
	setIcon(icon, 'chevron-right'); // CSS rotates it when open
	row.addClass('afm-expandable');
	row.setAttr('tabindex', '0');

	// Show the current state; classes do the rest.
	const apply = () => {
		const isOpen = open.has(id);
		row.toggleClass('is-open', isOpen);
		row.setAttr('aria-expanded', String(isOpen));
		details.forEach((d) => d.toggleClass('afm-hidden', !isOpen || !shown()));
	};
	const toggle = () => {
		if (open.has(id)) open.delete(id);
		else open.add(id);
		apply();
		onToggle();
	};

	apply();
	row.addEventListener('click', toggle);
	row.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault(); // stop Space scrolling the page
		toggle();
	});
	return apply;
}
