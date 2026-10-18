// Lays the cards in `grid` out in columns (at least `min` px wide), each new card going into the shortest column, so a
// tall card doesn't leave holes and opening one only moves the cards under it. Lays out again when the width changes.
export function masonry(grid: HTMLElement, min = 270): void {
	const cards = Array.from(grid.children) as HTMLElement[];
	grid.addClass('afm-masonry');
	let n = 0;
	const lay = () => {
		const want = Math.max(1, Math.min(cards.length, Math.floor((grid.clientWidth + 12) / (min + 12)) || 1));
		if (want === n) return;
		n = want;
		grid.empty();
		const cols = Array.from({ length: n }, () => grid.createDiv({ cls: 'afm-masonry-col' }));
		cards.forEach((c, i) => {
			const col = i < n ? cols[i] : cols.reduce((a, b) => (b.offsetHeight < a.offsetHeight ? b : a)); // first row in order
			col.appendChild(c);
		});
	};
	lay();
	if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => lay()).observe(grid);
}
