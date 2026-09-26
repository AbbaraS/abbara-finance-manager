// A point in SVG units.
export type Point = [number, number];

// "M x,y L x,y …": a line through the points.
export function linePath(points: Point[]): string {
	return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

// The same line, closed down to `baseY`, for a filled area.
export function areaPath(points: Point[], baseY: number): string {
	if (points.length === 0) return '';
	const [firstX] = points[0];
	const [lastX] = points[points.length - 1];
	return `${linePath(points)} L${lastX.toFixed(1)},${baseY.toFixed(1)} L${firstX.toFixed(1)},${baseY.toFixed(1)} Z`;
}
