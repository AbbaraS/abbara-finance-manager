import { linearScale, type Scale } from '../../utils/linearScale';

// SVG size and the scales that turn (day, money) into (x, y).
export interface ChartFrame {
	width: number;
	height: number;
	pad: { top: number; right: number; bottom: number; left: number };
	x: Scale; // day -> x
	y: Scale; // money -> y (up is more)
}

// Frame for a month of `days` and a money range min..max.
export function chartFrame(days: number, min: number, max: number): ChartFrame {
	const width = 640, height = 220;
	const pad = { top: 16, right: 80, bottom: 24, left: 52 }; // right leaves room for the end label
	return {
		width, height, pad,
		x: linearScale(1, days, pad.left, width - pad.right),
		y: linearScale(min, max, height - pad.bottom, pad.top),
	};
}
