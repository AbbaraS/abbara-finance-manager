// A bar growing from a centre line: right = spent more, left = spent less.
// `scale` is the biggest change in the table, so the longest bar fills its half.
export function changeBar(parent: HTMLElement, change: number, scale: number): void {
	const track = parent.createDiv({ cls: 'afm-change-track' });
	if (scale <= 0 || change === 0) return;

	const width = `${(Math.min(Math.abs(change) / scale, 1) * 50).toFixed(1)}%`; // each side is 50%
	const up = change > 0;
	const bar = track.createDiv({ cls: `afm-change-bar ${up ? 'is-up' : 'is-down'}` });
	bar.setCssStyles(up ? { left: '50%', width } : { right: '50%', width });
}
