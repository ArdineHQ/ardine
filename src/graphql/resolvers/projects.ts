import { builder } from '../schema/builder';
import { ProjectRef, ProjectConnection, ProjectMemberRef, TaskAssigneeRef } from '../schema/types';
import { ProjectInput, ProjectPatch, ListArgsInput } from '../schema/inputs';
import { parseOffsetLimit, buildQuery, calculatePageInfo } from '../utils';
import { NotFoundError, withErrorMapping } from '../errors';
import { requireAuth, requireTeamAccess, requireProjectRole, canViewProject, requireTeamManagement } from '../context';
import { Project, ProjectMember, TaskAssignee } from '../types';

/**
 * Project Queries
 */
builder.queryFields((t) => ({
  projects: t.field({
    type: ProjectConnection,
    args: {
      args: t.arg({ type: ListArgsInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const { teamId, offset: rawOffset, limit: rawLimit, search, status, from, to, orderBy, order } = args.args;
      await requireTeamAccess(ctx, teamId);

      const { offset, limit } = parseOffsetLimit(rawOffset, rawLimit, 100);

      // Base filter: projects must belong to the team
      const filters = [
        { sql: 'team_id = $1', params: [teamId] },
      ];

      // OWNER, ADMIN, VIEWER, and BILLING can see all projects in the team
      // MEMBER can only see projects where they are explicitly assigned
      if (ctx.auth.teamRole === 'MEMBER') {
        filters.push({
          sql: 'EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = $2)',
          params: [ctx.auth.userId!] // Non-null assertion: requireAuth ensures userId is not null
        });
      } else if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN' && ctx.auth.teamRole !== 'VIEWER' && ctx.auth.teamRole !== 'BILLING') {
        // Users without a team role can only see projects where they are a member
        filters.push({
          sql: 'EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = $2)',
          params: [ctx.auth.userId!]
        });
      }

      if (status === 'archived') {
        filters.push({ sql: 'archived_at IS NOT NULL', params: [] });
      } else if (status) {
        filters.push({ sql: `status = $${filters.length + 1}`, params: [status] });
      }

      const { query, countQuery, params } = buildQuery({
        baseSelect: 'SELECT *',
        baseFrom: 'FROM projects',
        filters,
        search: search ? { term: search, columns: ['name', 'code', 'description'] } : undefined,
        dateRange: from || to ? { from, to, field: 'created_at' } : undefined,
        orderBy,
        order: (order as 'asc' | 'desc'),
        allowedOrderBy: ['name', 'code', 'status', 'created_at', 'updated_at', 'start_date', 'due_date'],
        defaultOrderBy: 'created_at',
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

  project: t.field({
    type: ProjectRef,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.id);
      if (!project) {
        return null;
      }

      await requireTeamAccess(ctx, project.team_id);

      // Check if user has access to view this project
      const hasAccess = await canViewProject(ctx, args.id);
      if (!hasAccess) {
        return null;
      }

      return project;
    },
  }),
}));

/**
 * Project Mutations
 */
builder.mutationFields((t) => ({
  createProject: t.field({
    type: ProjectRef,
    args: {
      input: t.arg({ type: ProjectInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.input.teamId);
      requireTeamManagement(ctx); // Only OWNER and ADMIN can create projects

      return withErrorMapping(async () => {
        const result = await ctx.db.query<Project>(
          `
          INSERT INTO projects (
            team_id, client_id, name, description, code, status, color, tags,
            default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
            start_date, due_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
          `,
          [
            args.input.teamId,
            args.input.clientId,
            args.input.name,
            args.input.description,
            args.input.code,
            args.input.status,
            args.input.color,
            args.input.tags,
            args.input.defaultHourlyRateCents,
            args.input.budgetType,
            args.input.budgetHours,
            args.input.budgetAmountCents,
            args.input.startDate,
            args.input.dueDate,
          ]
        );

        return result.rows[0];
      });
    },
  }),

  updateProject: t.field({
    type: ProjectRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: ProjectPatch, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const existing = await ctx.loaders.projectById.load(args.id);
      if (!existing) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, existing.team_id);

      // Only MANAGER can update project
      await requireProjectRole(ctx, args.id, ['MANAGER']);

      return withErrorMapping(async () => {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 2;

        if (args.input.clientId !== undefined) {
          updates.push(`client_id = $${paramIndex++}`);
          values.push(args.input.clientId);
        }
        if (args.input.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(args.input.name);
        }
        if (args.input.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(args.input.description);
        }
        if (args.input.code !== undefined) {
          updates.push(`code = $${paramIndex++}`);
          values.push(args.input.code);
        }
        if (args.input.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(args.input.status);
        }
        if (args.input.color !== undefined) {
          updates.push(`color = $${paramIndex++}`);
          values.push(args.input.color);
        }
        if (args.input.tags !== undefined) {
          updates.push(`tags = $${paramIndex++}`);
          values.push(args.input.tags);
        }
        if (args.input.defaultHourlyRateCents !== undefined) {
          updates.push(`default_hourly_rate_cents = $${paramIndex++}`);
          values.push(args.input.defaultHourlyRateCents);
        }
        if (args.input.budgetType !== undefined) {
          updates.push(`budget_type = $${paramIndex++}`);
          values.push(args.input.budgetType);
        }
        if (args.input.budgetHours !== undefined) {
          updates.push(`budget_hours = $${paramIndex++}`);
          values.push(args.input.budgetHours);
        }
        if (args.input.budgetAmountCents !== undefined) {
          updates.push(`budget_amount_cents = $${paramIndex++}`);
          values.push(args.input.budgetAmountCents);
        }
        if (args.input.startDate !== undefined) {
          updates.push(`start_date = $${paramIndex++}`);
          values.push(args.input.startDate);
        }
        if (args.input.dueDate !== undefined) {
          updates.push(`due_date = $${paramIndex++}`);
          values.push(args.input.dueDate);
        }

        if (updates.length === 0) {
          return existing;
        }

        updates.push(`updated_at = NOW()`);

        const result = await ctx.db.query<Project>(
          `
          UPDATE projects
          SET ${updates.join(', ')}
          WHERE id = $1
          RETURNING *
          `,
          [args.id, ...values]
        );

        ctx.loaders.projectById.clear(args.id);
        return result.rows[0];
      });
    },
  }),

  setProjectStatus: t.field({
    type: ProjectRef,
    args: {
      id: t.arg.id({ required: true }),
      status: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Only MANAGER can change project status
      await requireProjectRole(ctx, args.id, ['MANAGER']);

      const result = await ctx.db.query<Project>(
        `
        UPDATE projects
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.id, args.status]
      );

      ctx.loaders.projectById.clear(args.id);
      return result.rows[0];
    },
  }),

  addProjectMember: t.field({
    type: ProjectMemberRef,
    args: {
      projectId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
      role: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Only MANAGER can add members to project
      await requireProjectRole(ctx, args.projectId, ['MANAGER']);

      return withErrorMapping(async () => {
        const result = await ctx.db.query<ProjectMember>(
          `
          INSERT INTO project_members (team_id, project_id, user_id, role)
          VALUES ($1, $2, $3, $4)
          RETURNING *
          `,
          [project.team_id, args.projectId, args.userId, args.role]
        );

        return result.rows[0];
      });
    },
  }),

  updateProjectMember: t.field({
    type: ProjectMemberRef,
    args: {
      id: t.arg.id({ required: true }),
      role: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const member = await ctx.loaders.projectMemberById.load(args.id);
      if (!member) {
        throw new NotFoundError('Project member not found');
      }

      await requireTeamAccess(ctx, member.team_id);

      // Only MANAGER can update member roles
      await requireProjectRole(ctx, member.project_id, ['MANAGER']);

      const result = await ctx.db.query<ProjectMember>(
        `
        UPDATE project_members
        SET role = $2
        WHERE id = $1
        RETURNING *
        `,
        [args.id, args.role]
      );

      ctx.loaders.projectMemberById.clear(args.id);
      return result.rows[0];
    },
  }),

  removeProjectMember: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const member = await ctx.loaders.projectMemberById.load(args.id);
      if (!member) {
        throw new NotFoundError('Project member not found');
      }

      await requireTeamAccess(ctx, member.team_id);

      // Only MANAGER can remove members from project
      await requireProjectRole(ctx, member.project_id, ['MANAGER']);

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          'DELETE FROM project_members WHERE id = $1',
          [args.id]
        );

        ctx.loaders.projectMemberById.clear(args.id);
        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),
}));
