// Named colours; the actual light/dark values are CSS variables in styles.css (--afm-c-<name>).
export const COLOR_NAMES = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red', 'gray'] as const;

export type ColorName = typeof COLOR_NAMES[number];

// True for a named colour (not a custom hex).
export function isColorName(color: string): color is ColorName {
	return (COLOR_NAMES as readonly string[]).includes(color);
}
