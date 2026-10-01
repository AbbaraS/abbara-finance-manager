import { App, Modal, Setting } from 'obsidian';
import type { PlaceChoice, Place } from '../models/restructure';

// What the window asks.
export interface MoveOptions {
	title: string;
	desc: string;
	button: string;         // e.g. "Move", "Delete"
	warning?: boolean;      // red button
	choices: PlaceChoice[];
	start?: number;         // choice picked at first
	subs?: string;          // name of the thing whose subcategories to ask about; empty = don't ask
	onDone: (place: Place | null, keepSubs: boolean) => void;
}

// Window that asks where a category's or subcategory's transactions go, then moves (or deletes) it.
export class MoveModal extends Modal {
	constructor(app: App, private o: MoveOptions) {
		super(app);
	}

	onOpen(): void {
		const { o, contentEl: el } = this;
		this.setTitle(o.title);
		el.createEl('p', { cls: 'afm-muted', text: o.desc });

		let pick = o.start ?? 0;
		let keepSubs = true;
		new Setting(el).setName('Move transactions and counterparties to').addDropdown((d) => {
			o.choices.forEach((c, i) => d.addOption(String(i), c.label));
			d.setValue(String(pick)).onChange((v) => (pick = Number(v)));
		});
		if (o.subs) {
			new Setting(el).setName(`${o.subs}'s subcategories`).addDropdown((d) => d
				.addOptions({ keep: 'Keep them (move them too)', merge: 'Merge them in' })
				.setValue('keep').onChange((v) => (keepSubs = v === 'keep')));
		}

		new Setting(el)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) => {
				b.setButtonText(o.button).onClick(() => {
					this.close();
					o.onDone(o.choices[pick]?.place ?? null, keepSubs);
				});
				if (o.warning) b.setWarning(); else b.setCta();
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
