import { App, FuzzySuggestModal, getIconIds, setIcon, type FuzzyMatch } from 'obsidian';

// Searchable list of every Lucide icon, each shown with its picture.
export class IconSuggestModal extends FuzzySuggestModal<string> {
	constructor(app: App, private onPick: (id: string) => void) {
		super(app);
		this.setPlaceholder('Search icons, e.g. car, coins, gift…');
	}

	getItems(): string[] {
		return getIconIds().map((id) => id.replace(/^lucide-/, ''));
	}

	getItemText(id: string): string {
		return id;
	}

	renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement): void {
		el.addClass('afm-icon-suggestion');
		setIcon(el.createSpan({ cls: 'afm-icon-suggestion-icon' }), match.item);
		el.createSpan({ text: match.item });
	}

	onChooseItem(id: string): void {
		this.onPick(id);
	}
}
