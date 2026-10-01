import { AbstractInputSuggest, type App } from 'obsidian';
import { setIconSafe } from '../views/look/setIconSafe';

// One suggestion: a tag you've used before, or a new one made from what you typed.
interface TagOption { tag: string; isNew: boolean }

// Tag chips (click × to remove) and a text box that suggests your tags as you type.
// Enter picks the highlighted suggestion; a comma or Enter with no suggestions adds what you typed.
export function tagInput(app: App, parent: HTMLElement, tags: string[], known: string[], onChange: (tags: string[]) => void): HTMLInputElement {
	const list = [...tags];
	const box = parent.createDiv({ cls: 'afm-tag-input' });
	const chips = box.createSpan({ cls: 'afm-tag-chips' });
	const input = box.createEl('input', { type: 'text', attr: { placeholder: list.length ? 'Add tag…' : 'Type a tag…' } });

	// Chips.
	const drawChips = () => {
		chips.empty();
		for (const tag of list) {
			const chip = chips.createSpan({ cls: 'afm-tag', text: `#${tag}` });
			const x = chip.createSpan({ cls: 'afm-tag-remove', attr: { 'aria-label': `Remove #${tag}` } });
			setIconSafe(x, 'x');
			x.addEventListener('click', (e) => {
				e.stopPropagation();
				list.remove(tag);
				drawChips();
				onChange([...list]);
			});
		}
	};

	// Adds a tag, reusing the spelling of a known tag that differs only in case.
	const add = (raw: string) => {
		const typed = raw.trim().replace(/^#/, '').trim();
		input.value = '';
		if (!typed) return;
		const tag = known.find((k) => k.toLowerCase() === typed.toLowerCase()) ?? typed;
		if (list.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
		list.push(tag);
		drawChips();
		onChange([...list]);
	};

	// Suggestions: unused known tags containing the text (starts-with first), then "New tag" if it's new.
	const options = (query: string): TagOption[] => {
		const typed = query.trim().replace(/^#/, '');
		const q = typed.toLowerCase();
		const found = known.filter((k) => k.toLowerCase().includes(q) && !list.some((t) => t.toLowerCase() === k.toLowerCase()))
			.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)))
			.map((tag) => ({ tag, isNew: false }));
		return q && !known.some((k) => k.toLowerCase() === q) ? [...found, { tag: typed, isNew: true }] : found;
	};
	new (class extends AbstractInputSuggest<TagOption> {
		getSuggestions(query: string) { return options(query); }
		renderSuggestion(o: TagOption, el: HTMLElement) {
			el.setText(o.isNew ? `New tag: #${o.tag}` : `#${o.tag}`);
		}
		selectSuggestion(o: TagOption) {
			add(o.tag);
			this.close();
		}
	})(app, input);

	// Comma adds; Backspace on an empty box removes the last tag.
	input.addEventListener('keydown', (e) => {
		if (e.key === ',' || (e.key === 'Enter' && options(input.value).length === 0)) {
			e.preventDefault();
			add(input.value);
		} else if (e.key === 'Backspace' && !input.value && list.length > 0) {
			list.pop();
			drawChips();
			onChange([...list]);
		}
	});
	input.addEventListener('click', (e) => e.stopPropagation()); // don't toggle the table row it sits in

	drawChips();
	return input;
}
