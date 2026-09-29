// Extra info saved for one transaction.
export interface TransactionDetails {
	sub?: string;   // subcategory; beats the rule's
	note?: string;  // free comment
	other?: string; // for transfers: the other account (when it can't be found)
}
