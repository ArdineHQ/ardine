export const INVOICE_STATUSES = {
	DRAFT: "draft",
	SENT: "sent",
	PAID: "paid",
	CANCELLED: "cancelled",
} as const;

export const DEFAULT_HOURLY_RATE_CENTS = 10000; // $100/hour
export const DEFAULT_TAX_RATE_PERCENT = 0;
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;
