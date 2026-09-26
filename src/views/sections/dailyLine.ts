import { dailyRunning } from '../../models/dailyRunning';
import { daysInMonth } from '../../utils/dates';
import { formatChange } from '../../utils/money';
import { niceRange } from '../../utils/niceRange';
import { areaPath, linePath, type Point } from '../../utils/svgPath';
import type { DashboardContext } from '../DashboardContext';
import { chartFrame } from './chartFrame';
import { lineHover } from './lineHover';
import { section } from './section';
import { svgAxes } from './svgAxes';

// Running net (income − spending) day by day, drawn as an SVG line.
export function dailyLine(el: HTMLElement, ctx: DashboardContext): void {
	// Data.
	const points = dailyRunning(ctx.rows, ctx.month, ctx.settings);
	const body = section(el, 'Running net through the month');
	if (points.length === 0) {
		body.createDiv({ cls: 'afm-muted', text: 'No transactions this month.' });
		return;
	}
	const s = ctx.settings;
	const days = daysInMonth(ctx.month);
	const values = points.map((p) => p.running);
	const range = niceRange(Math.min(0, ...values), Math.max(0, ...values));
	const f = chartFrame(days, range.min, range.max);
	const last = points[points.length - 1];

	// SVG with a text summary for screen readers.
	const wrap = body.createDiv({ cls: 'afm-line-chart', attr: { tabindex: '0' } });
	const svg = wrap.createSvg('svg', { attr: {
		viewBox: `0 0 ${f.width} ${f.height}`, role: 'img',
		'aria-label': `Running net ${formatChange(last.running, s)} by day ${last.day}. Use left and right arrows to read each day.`,
	} });
	svgAxes(svg, f, range, days, s);

	// Area, then line on top.
	const xy: Point[] = points.map((p) => [f.x(p.day), f.y(p.running)]);
	svg.createSvg('path', { cls: 'afm-area', attr: { d: areaPath(xy, f.y(0)) } });
	svg.createSvg('path', { cls: 'afm-line', attr: { d: linePath(xy) } });

	// Direct label on the last point only.
	const [lx, ly] = xy[xy.length - 1];
	svg.createSvg('circle', { cls: 'afm-dot', attr: { cx: lx, cy: ly, r: 4 } });
	const label = svg.createSvg('text', { cls: 'afm-end-label', attr: { x: lx + 8, y: ly + 4 } });
	label.textContent = formatChange(last.running, s);

	lineHover(wrap, svg, points, f, ctx);
}
