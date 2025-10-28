import { builder } from '../schema/builder';
import { ClientRef, ClientConnection } from '../schema/types';
import { ClientInput, ClientPatch, ListArgsInput } from '../schema/inputs';
import { parseOffsetLimit, buildQuery, calculatePageInfo } from '../utils';
import { NotFoundError, withErrorMapping } from '../errors';
import { requireAuth, requireTeamAccess, requireTeamManagement } from '../context';
import { Client } from '../types';

/**
 * Client Queries
 */
builder.queryFields((t) => ({
  /**
   * List clients with filters, search, and pagination
   */
  clients: t.field({
    type: ClientConnection,
    args: {
      args: t.arg({ type: ListArgsInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const { teamId, offset: rawOffset, limit: rawLimit, search, status, from, to, orderBy, order } = args.args;

      // Verify user has access to this team
      await requireTeamAccess(ctx, teamId);

      const { offset, limit } = parseOffsetLimit(rawOffset, rawLimit, 100);

      // Build filters
      const filters = [
        { sql: 'team_id = $1', params: [teamId] },
      ];

      // Status filter (archived vs active)
      if (status === 'archived') {
        filters.push({ sql: 'archived_at IS NOT NULL', params: [] });
      } else if (status === 'active') {
        filters.push({ sql: 'archived_at IS NULL', params: [] });
      }

      // Build query with all filters
      const { query, countQuery, params } = buildQuery({
        baseSelect: 'SELECT *',
        baseFrom: 'FROM clients',
        filters,
        search: search ? { term: search, columns: ['name', 'email', 'phone', 'contact_name'] } : undefined,
        dateRange: from || to ? { from, to, field: 'created_at' } : undefined,
        orderBy,
        order: (order as 'asc' | 'desc'),
        allowedOrderBy: ['name', 'email', 'created_at', 'updated_at'],
        defaultOrderBy: 'name',
        offset,
        limit,
      });

      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        ctx.db.query(query, params),
        ctx.db.query(countQuery, params.slice(0, -2)), // Remove LIMIT/OFFSET params for count
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

  /**
   * Get a single client by ID
   */
  client: t.field({
    type: ClientRef,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
      teamId: t.arg.id({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const client = await ctx.loaders.clientById.load(args.id);

      if (!client) {
        return null;
      }

      // Verify team access
      const teamId = args.teamId || client.team_id;
      await requireTeamAccess(ctx, teamId);

      return client;
    },
  }),

  /**
   * Search clients (typeahead)
   */
  searchClients: t.field({
    type: [ClientRef],
    args: {
      teamId: t.arg.id({ required: true }),
      q: t.arg.string({ required: true }),
      limit: t.arg.int({ defaultValue: 10 }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);

      const { limit } = parseOffsetLimit(0, args.limit, 50);

      const result = await ctx.db.query(
        `
        SELECT *
        FROM clients
        WHERE team_id = $1
          AND archived_at IS NULL
          AND (
            name ILIKE $2
            OR email ILIKE $2
            OR phone ILIKE $2
            OR contact_name ILIKE $2
          )
        ORDER BY name ASC
        LIMIT $3
        `,
        [args.teamId, `%${args.q}%`, limit]
      );

      return result.rows;
    },
  }),
}));

/**
 * Client Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Create a new client
   */
  createClient: t.field({
    type: ClientRef,
    args: {
      input: t.arg({ type: ClientInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.input.teamId);
      requireTeamManagement(ctx); // Only OWNER and ADMIN can create clients

      return withErrorMapping(async () => {
        const result = await ctx.db.query<Client>(
          `
          INSERT INTO clients (
            team_id, name, email, phone, notes, contact_name,
            billing_address, tax_id, default_hourly_rate_cents, currency
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
          `,
          [
            args.input.teamId,
            args.input.name,
            args.input.email,
            args.input.phone,
            args.input.notes,
            args.input.contactName,
            args.input.billingAddress ? JSON.stringify(args.input.billingAddress) : null,
            args.input.taxId,
            args.input.defaultHourlyRateCents,
            args.input.currency,
          ]
        );

        return result.rows[0];
      });
    },
  }),

  /**
   * Update an existing client
   */
  updateClient: t.field({
    type: ClientRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: ClientPatch, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      // Load existing client to verify team access
      const existingClient = await ctx.loaders.clientById.load(args.id);
      if (!existingClient) {
        throw new NotFoundError('Client not found');
      }

      await requireTeamAccess(ctx, existingClient.team_id);
      requireTeamManagement(ctx); // Only OWNER and ADMIN can update clients

      return withErrorMapping(async () => {
        // Build dynamic UPDATE query based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 2; // Start at 2 because $1 is the ID

        if (args.input.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(args.input.name);
        }
        if (args.input.email !== undefined) {
          updates.push(`email = $${paramIndex++}`);
          values.push(args.input.email);
        }
        if (args.input.phone !== undefined) {
          updates.push(`phone = $${paramIndex++}`);
          values.push(args.input.phone);
        }
        if (args.input.notes !== undefined) {
          updates.push(`notes = $${paramIndex++}`);
          values.push(args.input.notes);
        }
        if (args.input.contactName !== undefined) {
          updates.push(`contact_name = $${paramIndex++}`);
          values.push(args.input.contactName);
        }
        if (args.input.billingAddress !== undefined) {
          updates.push(`billing_address = $${paramIndex++}`);
          values.push(args.input.billingAddress ? JSON.stringify(args.input.billingAddress) : null);
        }
        if (args.input.taxId !== undefined) {
          updates.push(`tax_id = $${paramIndex++}`);
          values.push(args.input.taxId);
        }
        if (args.input.defaultHourlyRateCents !== undefined) {
          updates.push(`default_hourly_rate_cents = $${paramIndex++}`);
          values.push(args.input.defaultHourlyRateCents);
        }
        if (args.input.currency !== undefined) {
          updates.push(`currency = $${paramIndex++}`);
          values.push(args.input.currency);
        }

        if (updates.length === 0) {
          // No updates, return existing client
          return existingClient;
        }

        updates.push(`updated_at = NOW()`);

        const result = await ctx.db.query<Client>(
          `
          UPDATE clients
          SET ${updates.join(', ')}
          WHERE id = $1
          RETURNING *
          `,
          [args.id, ...values]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Client not found');
        }

        // Clear loader cache
        ctx.loaders.clientById.clear(args.id);

        return result.rows[0];
      });
    },
  }),

  /**
   * Delete a client
   */
  deleteClient: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const client = await ctx.loaders.clientById.load(args.id);
      if (!client) {
        throw new NotFoundError('Client not found');
      }

      await requireTeamAccess(ctx, client.team_id);
      requireTeamManagement(ctx); // Only OWNER and ADMIN can delete clients

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          'DELETE FROM clients WHERE id = $1',
          [args.id]
        );

        ctx.loaders.clientById.clear(args.id);

        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),

  /**
   * Archive a client
   */
  archiveClient: t.field({
    type: ClientRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const client = await ctx.loaders.clientById.load(args.id);
      if (!client) {
        throw new NotFoundError('Client not found');
      }

      await requireTeamAccess(ctx, client.team_id);
      requireTeamManagement(ctx); // Only OWNER and ADMIN can archive clients

      const result = await ctx.db.query<Client>(
        `
        UPDATE clients
        SET archived_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.id]
      );

      ctx.loaders.clientById.clear(args.id);

      return result.rows[0];
    },
  }),

  /**
   * Unarchive a client
   */
  unarchiveClient: t.field({
    type: ClientRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const client = await ctx.loaders.clientById.load(args.id);
      if (!client) {
        throw new NotFoundError('Client not found');
      }

      await requireTeamAccess(ctx, client.team_id);
      requireTeamManagement(ctx); // Only OWNER and ADMIN can unarchive clients

      const result = await ctx.db.query<Client>(
        `
        UPDATE clients
        SET archived_at = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.id]
      );

      ctx.loaders.clientById.clear(args.id);

      return result.rows[0];
    },
  }),
}));
