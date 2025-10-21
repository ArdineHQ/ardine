import { sql, type DatabasePool } from "slonik";
import type { Invoice, InvoiceListQuery } from "@ardine/shared";
import { invoiceRowParser } from "../parsers";

export class InvoicesRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * List invoices with filtering and pagination (team-scoped)
	 */
	async list(
		teamId: string,
		query: InvoiceListQuery,
	): Promise<{ items: Invoice[]; nextCursor?: string }> {
		const { q, clientId, status, limit, cursor } = query;

		// Build WHERE clause
		const conditions = [sql.fragment`team_id = ${teamId}`];

		// Add client filter
		if (clientId) {
			conditions.push(sql.fragment`client_id = ${clientId}`);
		}

		// Add status filter
		if (status === "draft") {
			conditions.push(sql.fragment`status = 'draft'`);
		} else if (status === "sent") {
			conditions.push(sql.fragment`status = 'sent'`);
		} else if (status === "paid") {
			conditions.push(sql.fragment`status = 'paid'`);
		} else if (status === "overdue") {
			// Overdue means: status is 'sent' and due_date is in the past
			conditions.push(
				sql.fragment`status = 'sent' AND due_date < CURRENT_DATE`,
			);
		}
		// 'all' status requires no filter

		// Add search filter
		if (q) {
			const searchTerm = `%${q}%`;
			conditions.push(
				sql.fragment`(
					lower(invoice_number) LIKE lower(${searchTerm})
					OR lower(notes) LIKE lower(${searchTerm})
				)`,
			);
		}

		// Add cursor filter
		if (cursor) {
			conditions.push(sql.fragment`id > ${cursor}`);
		}

		const whereClause = sql.join(conditions, sql.fragment` AND `);

		// Fetch limit + 1 to check for next page
		const result = await this.pool.query(sql.type(invoiceRowParser)`
			SELECT
				id, team_id, client_id, invoice_number, status,
				issued_date, due_date, subtotal_cents, tax_rate_percent,
				tax_amount_cents, total_cents, notes, created_at, updated_at
			FROM invoices
			WHERE ${whereClause}
			ORDER BY issued_date DESC, id ASC
			LIMIT ${limit + 1}
		`);

		const items = result.rows.slice(0, limit);
		const hasMore = result.rows.length > limit;
		const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

		return { items: [...items], nextCursor };
	}

	/**
	 * Find invoice by ID (team-scoped)
	 */
	async findById(id: string, teamId: string): Promise<Invoice | null> {
		const result = await this.pool.query(sql.type(invoiceRowParser)`
			SELECT
				id, team_id, client_id, invoice_number, status,
				issued_date, due_date, subtotal_cents, tax_rate_percent,
				tax_amount_cents, total_cents, notes, created_at, updated_at
			FROM invoices
			WHERE id = ${id} AND team_id = ${teamId}
		`);

		return result.rows[0] || null;
	}
}
