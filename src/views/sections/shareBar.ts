import { formatPercent } from '../../utils/percent';

// A thin bar filled to `share` (0-1). Reused by every breakdown table.
export function shareBar(parent: HTMLElement, share: number): HTMLElement {
	const track = parent.createDiv({ cls: 'afm-bar-track', attr: { 'aria-label': formatPercent(share) } });
	const fill = track.createDiv({ cls: 'afm-bar-fill' });
	const width = Math.min(Math.max(share, 0), 1) * 100; // keep 0-100 even with refunds
	fill.setCssStyles({ width: `${width}%` });
	return track;
}
