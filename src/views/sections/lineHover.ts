import type { DayPoint } from '../../models/dailyRunning';
import { formatChange } from '../../utils/money';
import type { DashboardContext } from '../DashboardContext';
import type { ChartFrame } from './chartFrame';

// Crosshair + tooltip that follows the mouse, or the arrow keys when the chart has focus.
export function lineHover(wrap: HTMLElement, svg: SVGElement, points: DayPoint[], f: ChartFrame, ctx: DashboardContext): void {
	// Hidden parts, shown on hover.
	const group = svg.createSvg('g', { cls: 'afm-hidden' });
	const line = group.createSvg('line', { cls: 'afm-hover-line', attr: { y1: f.pad.top, y2: f.height - f.pad.bottom } });
	const dot = group.createSvg('circle', { cls: 'afm-dot', attr: { r: 5 } });
	const tip = wrap.createDiv({ cls: 'afm-tooltip afm-hidden' });

	// Invisible box over the plot that catches the mouse.
	svg.createSvg('rect', { cls: 'afm-hover-overlay', attr: {
		x: f.pad.left, y: f.pad.top,
		width: f.width - f.pad.left - f.pad.right, height: f.height - f.pad.top - f.pad.bottom,
	} });

	let day = points.length;
	const [y, m] = ctx.month.split('-').map(Number);

	// Moves everything to one day.
	const show = (d: number) => {
		day = Math.min(Math.max(d, 1), points.length);
		const p = points[day - 1];
		const px = f.x(p.day), py = f.y(p.running);
		line.setAttrs({ x1: px, x2: px });
		dot.setAttrs({ cx: px, cy: py });
		const date = new Date(y, m - 1, p.day).toLocaleDateString(ctx.settings.locale, { day: 'numeric', month: 'short' });
		tip.setText(`${date} · that day ${formatChange(p.net, ctx.settings)} · so far ${formatChange(p.running, ctx.settings)}`);
		// Keep the tooltip inside the chart near the edges.
		tip.setCssStyles({ left: `${Math.min(Math.max((px / f.width) * 100, 20), 80)}%`, top: `${(py / f.height) * 100}%` });
		group.removeClass('afm-hidden');
		tip.removeClass('afm-hidden');
	};
	const hide = () => { group.addClass('afm-hidden'); tip.addClass('afm-hidden'); };

	// Mouse: screen x -> SVG x -> nearest day.
	svg.addEventListener('pointermove', (e) => {
		const box = svg.getBoundingClientRect();
		show(Math.round(f.x.invert(((e.clientX - box.left) / box.width) * f.width)));
	});
	svg.addEventListener('pointerleave', hide);

	// Keyboard.
	wrap.addEventListener('focus', () => show(day));
	wrap.addEventListener('blur', hide);
	wrap.addEventListener('keydown', (e) => {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		show(day + (e.key === 'ArrowRight' ? 1 : -1));
	});
}
