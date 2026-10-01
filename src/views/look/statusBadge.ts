import type { SubscriptionStatus } from '../../models/Subscription';
import { STATUS_LABELS } from '../../models/Subscription';

// A "Cancel!" or "Cancelled" pill; nothing for an active subscription.
export function statusBadge(parent: HTMLElement, status: SubscriptionStatus): void {
	if (status) parent.createSpan({ cls: `afm-status is-${status}`, text: STATUS_LABELS[status] });
}
