import { builder } from '../schema/builder';
import { InvoiceRef, InvoiceConnection, InvoiceItemRef } from '../schema/types';
import { InvoiceInput, InvoicePatch, InvoiceItemInput, InvoiceItemPatch } from '../schema/inputs';
import { parseOffsetLimit, buildQuery, calculatePageInfo } from '../utils';
import { NotFoundError, ConflictError, withErrorMapping } from '../errors';
import { requireAuth, requireTeamAccess, requireInvoiceAccess } from '../context';
import { Invoice, InvoiceItem } from '../types';

/**
 * Invoice Queries
 */
builder.queryFields((t) => ({
  invoices: t.field({
    type: InvoiceConnection,
    args: {
      teamId: t.arg.id({ required: true }),
      clientId: t.arg.id({ required: false }),
      status: t.arg.string({ required: false }),
      from: t.arg({ type: 'DateTime', required: false }),
      to: t.arg({ type: 'DateTime', required: false }),
      offset: t.arg.int({ defaultValue: 0 }),
      limit: t.arg.int({ defaultValue: 25 }),
      orderBy: t.arg.string({ required: false }),
      order: t.arg.string({ defaultValue: 'desc' }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);
      requireInvoiceAccess(ctx); // Only OWNER, ADMIN, and BILLING can access invoices

      const { offset, limit } = parseOffsetLimit(args.offset, args.limit, 100);

      const filters = [
        { sql: 'team_id = $1', params: [args.teamId] },
      ];

      let paramIndex = 2;

      if (args.clientId) {
        filters.push({ sql: `client_id = $${paramIndex++}`, params: [args.clientId] });
      }

      if (args.status) {
        filters.push({ sql: `status = $${paramIndex++}`, params: [args.status] });
      }

      const { query, countQuery, params } = buildQuery({
        baseSelect: 'SELECT *',
        baseFrom: 'FROM invoices',
        filters,
        dateRange: args.from || args.to ? { from: args.from, to: args.to, field: 'issued_date' } : undefined,
        orderBy: args.orderBy,
        order: (args.order as 'asc' | 'desc') || 'desc',
        allowedOrderBy: ['invoice_number', 'issued_date', 'due_date', 'total_cents', 'created_at'],
        defaultOrderBy: 'issued_date',
        offset,
        limit,
      });

      const [dataResult, countResult] = await Promise.all([
        ctx.db.query(query, params),
        ctx.db.query(countQuery, params.slice(0, -2)),
      ]);

      const total = parseInt(countResult.rows[0]?.total || '0', 10);
      const pageInfo = calculatePageInfo(offset, limit, total);

      return {
        nodes: dataResult.rows,
        total,
        pageInfo,
      };
    },
  }),

  invoice: t.field({
    type: InvoiceRef,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      // Allow public access for viewing, auth check handled by team access
      const invoice = await ctx.loaders.invoiceById.load(args.id);
      if (!invoice) {
        return null;
      }

      // Check if invoice is public (sent or paid status)
      const isPublicInvoice = invoice.status === 'sent' || invoice.status === 'paid';

      // If user is authenticated and invoice belongs to their team, verify permissions
      if (ctx.auth.userId && ctx.auth.teamId === invoice.team_id) {
        await requireTeamAccess(ctx, invoice.team_id);
        requireInvoiceAccess(ctx); // Only OWNER, ADMIN, and BILLING can access invoices
      }
      // If invoice doesn't belong to user's team (or user is not authenticated), only allow public invoices
      else if (!isPublicInvoice) {
        return null;
      }

      return invoice;
    },
  }),
}));

/**
 * Invoice Mutations
 */
builder.mutationFields((t) => ({
  createInvoice: t.field({
    type: InvoiceRef,
    args: {
      input: t.arg({ type: InvoiceInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.input.teamId);
      requireInvoiceAccess(ctx); // Only OWNER, ADMIN, and BILLING can create invoices

      return withErrorMapping(async () => {
        // Initialize with 0 for calculated fields (items will be added separately)
        const result = await ctx.db.query<Invoice>(
          `
          INSERT INTO invoices (
            team_id, client_id, invoice_number, status, issued_date, due_date,
            subtotal_cents, tax_rate_percent, tax_amount_cents, total_cents, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 0, 0, $8)
          RETURNING *
          `,
          [
            args.input.teamId,
            args.input.clientId,
            args.input.invoiceNumber,
            args.input.status,
            args.input.issuedDate,
            args.input.dueDate,
            args.input.taxRatePercent,
            args.input.notes,
          ]
        );

        return result.rows[0];
      });
    },
  }),

  updateInvoice: t.field({
    type: InvoiceRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: InvoicePatch, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const existing = await ctx.loaders.invoiceById.load(args.id);
      if (!existing) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, existing.team_id);
      requireInvoiceAccess(ctx); // Only OWNER, ADMIN, and BILLING can update invoices

      return withErrorMapping(async () => {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 2;

        if (args.input.invoiceNumber !== undefined) {
          updates.push(`invoice_number = $${paramIndex++}`);
          values.push(args.input.invoiceNumber);
        }
        if (args.input.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(args.input.status);
        }
        if (args.input.issuedDate !== undefined) {
          updates.push(`issued_date = $${paramIndex++}`);
          values.push(args.input.issuedDate);
        }
        if (args.input.dueDate !== undefined) {
          updates.push(`due_date = $${paramIndex++}`);
          values.push(args.input.dueDate);
        }
        if (args.input.taxRatePercent !== undefined) {
          updates.push(`tax_rate_percent = $${paramIndex++}`);
          values.push(args.input.taxRatePercent);
        }
        if (args.input.notes !== undefined) {
          updates.push(`notes = $${paramIndex++}`);
          values.push(args.input.notes);
        }

        if (updates.length === 0) {
          return existing;
        }

        updates.push(`updated_at = NOW()`);

        const result = await ctx.db.query<Invoice>(
          `
          UPDATE invoices
          SET ${updates.join(', ')}
          WHERE id = $1
          RETURNING *
          `,
          [args.id, ...values]
        );

        ctx.loaders.invoiceById.clear(args.id);
        return result.rows[0];
      });
    },
  }),

  deleteInvoice: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoice = await ctx.loaders.invoiceById.load(args.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, invoice.team_id);
      requireInvoiceAccess(ctx); // Only OWNER, ADMIN, and BILLING can delete invoices

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          'DELETE FROM invoices WHERE id = $1',
          [args.id]
        );

        ctx.loaders.invoiceById.clear(args.id);
        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),

  markInvoicePaid: t.field({
    type: InvoiceRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoice = await ctx.loaders.invoiceById.load(args.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, invoice.team_id);

      const result = await ctx.db.query<Invoice>(
        `
        UPDATE invoices
        SET status = 'paid', updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.id]
      );

      ctx.loaders.invoiceById.clear(args.id);
      return result.rows[0];
    },
  }),

  markInvoiceSent: t.field({
    type: InvoiceRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoice = await ctx.loaders.invoiceById.load(args.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, invoice.team_id);

      // Only allow marking as sent if currently draft
      if (invoice.status !== 'draft') {
        throw new ConflictError('Invoice must be in draft status to mark as sent');
      }

      const result = await ctx.db.query<Invoice>(
        `
        UPDATE invoices
        SET status = 'sent', updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.id]
      );

      ctx.loaders.invoiceById.clear(args.id);
      return result.rows[0];
    },
  }),

  cancelInvoice: t.field({
    type: InvoiceRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoice = await ctx.loaders.invoiceById.load(args.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, invoice.team_id);

      const result = await ctx.db.query<Invoice>(
        `
        UPDATE invoices
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.id]
      );

      ctx.loaders.invoiceById.clear(args.id);
      return result.rows[0];
    },
  }),

  addInvoiceItem: t.field({
    type: InvoiceItemRef,
    args: {
      invoiceId: t.arg.id({ required: true }),
      input: t.arg({ type: InvoiceItemInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoice = await ctx.loaders.invoiceById.load(args.invoiceId);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, invoice.team_id);

      return withErrorMapping(async () => {
        // Check if any time entries are already on another invoice (using junction table)
        if (args.input.timeEntryIds && args.input.timeEntryIds.length > 0) {
          const existingEntries = await ctx.db.query(
            `
            SELECT ite.time_entry_id, i.invoice_number
            FROM invoice_time_entries ite
            JOIN invoices i ON i.id = ite.invoice_id
            WHERE ite.time_entry_id = ANY($1) AND ite.invoice_id != $2
            LIMIT 1
            `,
            [args.input.timeEntryIds, args.invoiceId]
          );

          if (existingEntries.rows.length > 0) {
            throw new ConflictError(
              'One or more time entries have already been added to another invoice',
              `Time entry is already on invoice ${existingEntries.rows[0].invoice_number}`
            );
          }
        }

        // Calculate amount
        const amountCents = Math.round(args.input.quantity * args.input.rateCents);

        // Insert invoice item (without linking to specific time entry in invoice_items table)
        const result = await ctx.db.query<InvoiceItem>(
          `
          INSERT INTO invoice_items (
            team_id, invoice_id, time_entry_id, description, quantity, rate_cents, amount_cents
          )
          VALUES ($1, $2, NULL, $3, $4, $5, $6)
          RETURNING *
          `,
          [
            invoice.team_id,
            args.invoiceId,
            args.input.description,
            args.input.quantity,
            args.input.rateCents,
            amountCents,
          ]
        );

        // Link all time entries to this invoice and invoice item in the junction table
        if (args.input.timeEntryIds && args.input.timeEntryIds.length > 0) {
          const values = args.input.timeEntryIds.map((_, i) =>
            `($1, $${i + 3}, $2)`
          ).join(', ');

          await ctx.db.query(
            `
            INSERT INTO invoice_time_entries (invoice_id, time_entry_id, invoice_item_id)
            VALUES ${values}
            ON CONFLICT (time_entry_id) DO NOTHING
            `,
            [args.invoiceId, result.rows[0].id, ...args.input.timeEntryIds]
          );
        }

        // Recalculate invoice totals
        await recalculateInvoiceTotals(ctx.db.query, args.invoiceId);
        ctx.loaders.invoiceById.clear(args.invoiceId);

        return result.rows[0];
      });
    },
  }),

  updateInvoiceItem: t.field({
    type: InvoiceItemRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: InvoiceItemPatch, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const existing = await ctx.loaders.invoiceItemById.load(args.id);
      if (!existing) {
        throw new NotFoundError('Invoice item not found');
      }

      await requireTeamAccess(ctx, existing.team_id);

      return withErrorMapping(async () => {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 2;

        if (args.input.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(args.input.description);
        }
        if (args.input.quantity !== undefined) {
          updates.push(`quantity = $${paramIndex++}`);
          values.push(args.input.quantity);
        }
        if (args.input.rateCents !== undefined) {
          updates.push(`rate_cents = $${paramIndex++}`);
          values.push(args.input.rateCents);
        }

        if (updates.length > 0) {
          // Recalculate amount if quantity or rate changed
          if (args.input.quantity !== undefined || args.input.rateCents !== undefined) {
            const quantity = args.input.quantity ?? existing.quantity;
            const rateCents = args.input.rateCents ?? existing.rate_cents;
            const amountCents = Math.round(quantity * rateCents);
            updates.push(`amount_cents = $${paramIndex++}`);
            values.push(amountCents);
          }

          const result = await ctx.db.query<InvoiceItem>(
            `
            UPDATE invoice_items
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *
            `,
            [args.id, ...values]
          );

          ctx.loaders.invoiceItemById.clear(args.id);

          // Recalculate invoice totals
          await recalculateInvoiceTotals(ctx.db.query, existing.invoice_id);
          ctx.loaders.invoiceById.clear(existing.invoice_id);

          return result.rows[0];
        }

        return existing;
      });
    },
  }),

  removeInvoiceItem: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const item = await ctx.loaders.invoiceItemById.load(args.id);
      if (!item) {
        throw new NotFoundError('Invoice item not found');
      }

      await requireTeamAccess(ctx, item.team_id);

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          'DELETE FROM invoice_items WHERE id = $1',
          [args.id]
        );

        ctx.loaders.invoiceItemById.clear(args.id);

        // Recalculate invoice totals
        await recalculateInvoiceTotals(ctx.db.query, item.invoice_id);
        ctx.loaders.invoiceById.clear(item.invoice_id);

        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),

  removeTimeEntryFromInvoice: t.field({
    type: 'Boolean',
    args: {
      invoiceId: t.arg.id({ required: true }),
      timeEntryId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoice = await ctx.loaders.invoiceById.load(args.invoiceId);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      await requireTeamAccess(ctx, invoice.team_id);

      return withErrorMapping(async () => {
        // Get the invoice_item_id before deleting
        const junctionEntry = await ctx.db.query(
          'SELECT invoice_item_id FROM invoice_time_entries WHERE invoice_id = $1 AND time_entry_id = $2',
          [args.invoiceId, args.timeEntryId]
        );

        if (junctionEntry.rows.length === 0) {
          return false;
        }

        const invoiceItemId = junctionEntry.rows[0].invoice_item_id;

        // Delete the time entry from the junction table
        const result = await ctx.db.query(
          'DELETE FROM invoice_time_entries WHERE invoice_id = $1 AND time_entry_id = $2',
          [args.invoiceId, args.timeEntryId]
        );

        // Recalculate the invoice item quantity if it has an associated item
        if (invoiceItemId) {
          // Get the invoice item to get the rate
          const invoiceItem = await ctx.loaders.invoiceItemById.load(invoiceItemId);

          if (invoiceItem) {
            // Calculate new total hours from remaining time entries
            const remainingEntries = await ctx.db.query(
              `
              SELECT SUM(te.duration_seconds) as total_seconds
              FROM invoice_time_entries ite
              JOIN time_entries te ON te.id = ite.time_entry_id
              WHERE ite.invoice_item_id = $1
              `,
              [invoiceItemId]
            );

            const totalSeconds = remainingEntries.rows[0]?.total_seconds || 0;
            const totalHours = totalSeconds / 3600;
            const newAmountCents = Math.round(totalHours * invoiceItem.rate_cents);

            // Update the invoice item
            await ctx.db.query(
              `
              UPDATE invoice_items
              SET quantity = $1, amount_cents = $2
              WHERE id = $3
              `,
              [totalHours, newAmountCents, invoiceItemId]
            );

            ctx.loaders.invoiceItemById.clear(invoiceItemId);
          }

          // Recalculate invoice totals
          await recalculateInvoiceTotals(ctx.db.query, args.invoiceId);
          ctx.loaders.invoiceById.clear(args.invoiceId);
        }

        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),

  addTimeEntriesToInvoiceItem: t.field({
    type: 'Boolean',
    args: {
      invoiceItemId: t.arg.id({ required: true }),
      timeEntryIds: t.arg.idList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const invoiceItem = await ctx.loaders.invoiceItemById.load(args.invoiceItemId);
      if (!invoiceItem) {
        throw new NotFoundError('Invoice item not found');
      }

      await requireTeamAccess(ctx, invoiceItem.team_id);

      return withErrorMapping(async () => {
        // Check if any time entries are already on another invoice
        const existingEntries = await ctx.db.query(
          `
          SELECT ite.time_entry_id, i.invoice_number
          FROM invoice_time_entries ite
          JOIN invoices i ON i.id = ite.invoice_id
          WHERE ite.time_entry_id = ANY($1) AND ite.invoice_id != $2
          LIMIT 1
          `,
          [args.timeEntryIds, invoiceItem.invoice_id]
        );

        if (existingEntries.rows.length > 0) {
          throw new ConflictError(
            'One or more time entries have already been added to another invoice',
            `Time entry is already on invoice ${existingEntries.rows[0].invoice_number}`
          );
        }

        // Insert new time entries into junction table
        const values = args.timeEntryIds.map((_, i) =>
          `($1, $${i + 3}, $2)`
        ).join(', ');

        await ctx.db.query(
          `
          INSERT INTO invoice_time_entries (invoice_id, time_entry_id, invoice_item_id)
          VALUES ${values}
          ON CONFLICT (time_entry_id) DO NOTHING
          `,
          [invoiceItem.invoice_id, args.invoiceItemId, ...args.timeEntryIds]
        );

        // Recalculate invoice item quantity and amount based on all time entries
        const allEntries = await ctx.db.query(
          `
          SELECT SUM(te.duration_seconds) as total_seconds
          FROM invoice_time_entries ite
          JOIN time_entries te ON te.id = ite.time_entry_id
          WHERE ite.invoice_item_id = $1
          `,
          [args.invoiceItemId]
        );

        const totalSeconds = allEntries.rows[0]?.total_seconds || 0;
        const totalHours = totalSeconds / 3600;
        const newAmountCents = Math.round(totalHours * invoiceItem.rate_cents);

        // Update the invoice item
        await ctx.db.query(
          `
          UPDATE invoice_items
          SET quantity = $1, amount_cents = $2
          WHERE id = $3
          `,
          [totalHours, newAmountCents, args.invoiceItemId]
        );

        ctx.loaders.invoiceItemById.clear(args.invoiceItemId);

        // Recalculate invoice totals
        await recalculateInvoiceTotals(ctx.db.query, invoiceItem.invoice_id);
        ctx.loaders.invoiceById.clear(invoiceItem.invoice_id);

        return true;
      });
    },
  }),
}));

/**
 * Helper to recalculate invoice totals
 */
async function recalculateInvoiceTotals(
  query: (text: string, params?: any[]) => Promise<any>,
  invoiceId: string
): Promise<void> {
  await query(
    `
    UPDATE invoices
    SET
      subtotal_cents = (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_items WHERE invoice_id = $1),
      tax_amount_cents = ROUND((SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_items WHERE invoice_id = $1) * tax_rate_percent / 100),
      total_cents = (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_items WHERE invoice_id = $1) + ROUND((SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_items WHERE invoice_id = $1) * tax_rate_percent / 100),
      updated_at = NOW()
    WHERE id = $1
    `,
    [invoiceId]
  );
}
