// Named colours; the actual light/dark values are CSS variables in styles.css (--afm-c-<name>).
export const COLOR_NAMES = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red', 'gray'] as const;

export type ColorName = typeof COLOR_NAMES[number];

// Light-theme hex of each name, to show in the colour picker.
export const COLOR_HEX: Record<ColorName, string> = {
	blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4',
	green: '#008300', violet: '#4a3aa7', red: '#e34948', gray: '#8a8984',
};

// True for a named colour (not a custom hex).
export function isColorName(color: string): color is ColorName {
	return (COLOR_NAMES as readonly string[]).includes(color);
}
