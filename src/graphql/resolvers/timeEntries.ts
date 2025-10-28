import { builder } from '../schema/builder';
import { TimeEntryRef, TimeEntryConnection } from '../schema/types';
import { parseOffsetLimit, buildQuery, calculatePageInfo } from '../utils';
import { NotFoundError, withErrorMapping, ValidationError, UnauthorizedError } from '../errors';
import { requireAuth, requireTeamAccess, canLogTime, requireProjectRole, getProjectMemberRole } from '../context';
import { TimeEntry } from '../types';

/**
 * TimeEntry Queries
 */
builder.queryFields((t) => ({
  timeEntries: t.field({
    type: TimeEntryConnection,
    args: {
      teamId: t.arg.id({ required: true }),
      projectId: t.arg.id({ required: false }),
      taskId: t.arg.id({ required: false }),
      userId: t.arg.id({ required: false }),
      clientId: t.arg.id({ required: false }),
      from: t.arg({ type: 'DateTime', required: false }),
      to: t.arg({ type: 'DateTime', required: false }),
      billable: t.arg.boolean({ required: false }),
      uninvoicedOnly: t.arg.boolean({ required: false }),
      offset: t.arg.int({ defaultValue: 0 }),
      limit: t.arg.int({ defaultValue: 25 }),
      orderBy: t.arg.string({ required: false }),
      order: t.arg.string({ defaultValue: 'desc' }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);

      const { offset, limit } = parseOffsetLimit(args.offset, args.limit, 100);

      // Base filter: time entries must belong to the team
      const filters = [
        { sql: 'team_id = $1', params: [args.teamId] },
      ];

      // OWNER, ADMIN, VIEWER, and BILLING can see all time entries in the team
      // MEMBER can only see time entries from projects where they are explicitly assigned
      if (ctx.auth.teamRole === 'MEMBER') {
        filters.push({
          sql: 'EXISTS (SELECT 1 FROM project_members WHERE project_id = time_entries.project_id AND user_id = $2)',
          params: [ctx.auth.userId!] // Non-null assertion: requireAuth ensures userId is not null
        });
      } else if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN' && ctx.auth.teamRole !== 'VIEWER' && ctx.auth.teamRole !== 'BILLING') {
        // Users without a team role can only see time entries from projects where they are a member
        filters.push({
          sql: 'EXISTS (SELECT 1 FROM project_members WHERE project_id = time_entries.project_id AND user_id = $2)',
          params: [ctx.auth.userId!]
        });
      }

      // Calculate the next parameter index based on how many params we've added so far
      let paramIndex = filters.reduce((sum, f) => sum + f.params.length, 0) + 1;

      if (args.projectId) {
        filters.push({ sql: `project_id = $${paramIndex++}`, params: [args.projectId] });
      }

      if (args.taskId) {
        filters.push({ sql: `task_id = $${paramIndex++}`, params: [args.taskId] });
      }

      if (args.userId) {
        filters.push({ sql: `user_id = $${paramIndex++}`, params: [args.userId] });
      }

      if (args.clientId) {
        filters.push({ sql: `client_id = $${paramIndex++}`, params: [args.clientId] });
      }

      if (args.billable !== undefined && args.billable !== null) {
        filters.push({ sql: `billable = $${paramIndex++}`, params: [args.billable as any] });
      }

      if (args.uninvoicedOnly) {
        filters.push({
          sql: `id NOT IN (SELECT time_entry_id FROM invoice_time_entries)`,
          params: []
        });
      }

      const { query, countQuery, params } = buildQuery({
        baseSelect: 'SELECT *',
        baseFrom: 'FROM time_entries',
        filters,
        dateRange: args.from || args.to ? { from: args.from, to: args.to, field: 'started_at' } : undefined,
        orderBy: args.orderBy,
        order: (args.order as 'asc' | 'desc') || 'desc',
        allowedOrderBy: ['started_at', 'stopped_at', 'duration_seconds', 'created_at'],
        defaultOrderBy: 'started_at',
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
}));

/**
 * TimeEntry Mutations
 */
builder.mutationFields((t) => ({
  startTimer: t.field({
    type: TimeEntryRef,
    args: {
      projectId: t.arg.id({ required: true }),
      taskId: t.arg.id({ required: false }),
      note: t.arg.string({ required: false }),
      billable: t.arg.boolean({ defaultValue: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Only MANAGER and CONTRIBUTOR can log time
      const canLog = await canLogTime(ctx, args.projectId);
      if (!canLog) {
        throw new UnauthorizedError('You do not have permission to log time on this project');
      }

      // Verify task belongs to project if provided
      if (args.taskId) {
        const task = await ctx.loaders.taskById.load(args.taskId);
        if (!task || task.project_id !== args.projectId) {
          throw new ValidationError('Task does not belong to the specified project');
        }
      }

      return withErrorMapping(async () => {
        const result = await ctx.db.query<TimeEntry>(
          `
          INSERT INTO time_entries (
            team_id, project_id, task_id, user_id, client_id,
            note, started_at, billable
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
          RETURNING *
          `,
          [
            project.team_id,
            args.projectId,
            args.taskId,
            ctx.auth.userId,
            project.client_id,
            args.note,
            args.billable,
          ]
        );

        return result.rows[0];
      });
    },
  }),

  stopTimer: t.field({
    type: TimeEntryRef,
    args: {
      timeEntryId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const timeEntry = await ctx.loaders.timeEntryById.load(args.timeEntryId);
      if (!timeEntry) {
        throw new NotFoundError('Time entry not found');
      }

      await requireTeamAccess(ctx, timeEntry.team_id);

      // Only MANAGER and CONTRIBUTOR can stop timers, and must be their own timer
      const canLog = await canLogTime(ctx, timeEntry.project_id);
      if (!canLog) {
        throw new UnauthorizedError('You do not have permission to log time on this project');
      }

      if (timeEntry.user_id !== ctx.auth.userId) {
        throw new UnauthorizedError('You can only stop your own timers');
      }

      if (timeEntry.stopped_at) {
        throw new ValidationError('Timer already stopped');
      }

      // Get the project to determine hourly rate
      const project = await ctx.loaders.projectById.load(timeEntry.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Determine hourly rate (task > project > client)
      let hourlyRateCents: number | null = null;

      if (timeEntry.task_id) {
        const task = await ctx.loaders.taskById.load(timeEntry.task_id);
        if (task?.hourly_rate_cents) {
          hourlyRateCents = task.hourly_rate_cents;
        }
      }

      if (!hourlyRateCents && project.default_hourly_rate_cents) {
        hourlyRateCents = project.default_hourly_rate_cents;
      }

      if (!hourlyRateCents && project.client_id) {
        const client = await ctx.loaders.clientById.load(project.client_id);
        if (client?.default_hourly_rate_cents) {
          hourlyRateCents = client.default_hourly_rate_cents;
        }
      }

      // Calculate duration and amount
      const stoppedAt = new Date();
      const startedAt = new Date(timeEntry.started_at);
      const durationSeconds = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);

      // Calculate amount: (duration in hours) * hourly rate
      let amountCents: number | null = null;
      if (hourlyRateCents && timeEntry.billable) {
        const durationHours = durationSeconds / 3600;
        amountCents = Math.round(durationHours * hourlyRateCents);
      }

      const result = await ctx.db.query<TimeEntry>(
        `
        UPDATE time_entries
        SET
          stopped_at = $2,
          duration_seconds = $3,
          hourly_rate_cents = $4,
          amount_cents = $5,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [args.timeEntryId, stoppedAt, durationSeconds, hourlyRateCents, amountCents]
      );

      ctx.loaders.timeEntryById.clear(args.timeEntryId);
      return result.rows[0];
    },
  }),

  createTimeEntry: t.field({
    type: TimeEntryRef,
    args: {
      projectId: t.arg.id({ required: true }),
      taskId: t.arg.id({ required: false }),
      note: t.arg.string({ required: false }),
      startedAt: t.arg({ type: 'DateTime', required: true }),
      stoppedAt: t.arg({ type: 'DateTime', required: true }),
      billable: t.arg.boolean({ defaultValue: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Only MANAGER and CONTRIBUTOR can log time
      const canLog = await canLogTime(ctx, args.projectId);
      if (!canLog) {
        throw new UnauthorizedError('You do not have permission to log time on this project');
      }

      // Verify task belongs to project if provided
      if (args.taskId) {
        const task = await ctx.loaders.taskById.load(args.taskId);
        if (!task || task.project_id !== args.projectId) {
          throw new ValidationError('Task does not belong to the specified project');
        }
      }

      // Validate that stoppedAt is after startedAt
      const startedAt = new Date(args.startedAt);
      const stoppedAt = new Date(args.stoppedAt);
      if (stoppedAt <= startedAt) {
        throw new ValidationError('End time must be after start time');
      }

      // Calculate duration
      const durationSeconds = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);

      // Determine hourly rate (task > project > client)
      let hourlyRateCents: number | null = null;

      if (args.taskId) {
        const task = await ctx.loaders.taskById.load(args.taskId);
        if (task?.hourly_rate_cents) {
          hourlyRateCents = task.hourly_rate_cents;
        }
      }

      if (!hourlyRateCents && project.default_hourly_rate_cents) {
        hourlyRateCents = project.default_hourly_rate_cents;
      }

      if (!hourlyRateCents && project.client_id) {
        const client = await ctx.loaders.clientById.load(project.client_id);
        if (client?.default_hourly_rate_cents) {
          hourlyRateCents = client.default_hourly_rate_cents;
        }
      }

      // Calculate amount: (duration in hours) * hourly rate
      let amountCents: number | null = null;
      if (hourlyRateCents && args.billable) {
        const durationHours = durationSeconds / 3600;
        amountCents = Math.round(durationHours * hourlyRateCents);
      }

      return withErrorMapping(async () => {
        const result = await ctx.db.query<TimeEntry>(
          `
          INSERT INTO time_entries (
            team_id, project_id, task_id, user_id, client_id,
            note, started_at, stopped_at, duration_seconds,
            billable, hourly_rate_cents, amount_cents
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
          `,
          [
            project.team_id,
            args.projectId,
            args.taskId,
            ctx.auth.userId,
            project.client_id,
            args.note,
            startedAt,
            stoppedAt,
            durationSeconds,
            args.billable,
            hourlyRateCents,
            amountCents,
          ]
        );

        return result.rows[0];
      });
    },
  }),

  updateTimeEntry: t.field({
    type: TimeEntryRef,
    args: {
      timeEntryId: t.arg.id({ required: true }),
      projectId: t.arg.id({ required: false }),
      taskId: t.arg.id({ required: false }),
      note: t.arg.string({ required: false }),
      startedAt: t.arg({ type: 'DateTime', required: false }),
      stoppedAt: t.arg({ type: 'DateTime', required: false }),
      billable: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const timeEntry = await ctx.loaders.timeEntryById.load(args.timeEntryId);
      if (!timeEntry) {
        throw new NotFoundError('Time entry not found');
      }

      await requireTeamAccess(ctx, timeEntry.team_id);

      // Team OWNER and ADMIN can edit any time entry
      // Otherwise, check project-level permissions: MANAGER can edit any, CONTRIBUTOR can edit their own
      const isTeamAdmin = ctx.auth.teamRole === 'OWNER' || ctx.auth.teamRole === 'ADMIN';

      if (!isTeamAdmin) {
        const role = await getProjectMemberRole(ctx, timeEntry.project_id);
        if (!role) {
          throw new UnauthorizedError('You do not have access to this project');
        }

        if (role === 'VIEWER') {
          throw new UnauthorizedError('Viewers cannot edit time entries');
        }

        if (role === 'CONTRIBUTOR' && timeEntry.user_id !== ctx.auth.userId) {
          throw new UnauthorizedError('Contributors can only edit their own time entries');
        }
      }

      // Determine which values to use (new or existing)
      const projectId = args.projectId ?? timeEntry.project_id;
      const taskId = args.taskId !== undefined ? args.taskId : timeEntry.task_id;
      const note = args.note !== undefined ? args.note : timeEntry.note;
      const startedAt = args.startedAt ? new Date(args.startedAt) : new Date(timeEntry.started_at);
      const stoppedAt = args.stoppedAt ? new Date(args.stoppedAt) : timeEntry.stopped_at ? new Date(timeEntry.stopped_at) : null;
      const billable = args.billable ?? timeEntry.billable;

      // Verify project exists if changing
      let project;
      if (args.projectId && args.projectId !== timeEntry.project_id) {
        project = await ctx.loaders.projectById.load(args.projectId);
        if (!project) {
          throw new NotFoundError('Project not found');
        }
        await requireTeamAccess(ctx, project.team_id);
      } else {
        project = await ctx.loaders.projectById.load(timeEntry.project_id);
        if (!project) {
          throw new NotFoundError('Project not found');
        }
      }

      // Verify task belongs to project if provided
      if (taskId) {
        const task = await ctx.loaders.taskById.load(taskId);
        if (!task || task.project_id !== projectId) {
          throw new ValidationError('Task does not belong to the specified project');
        }
      }

      // Validate and calculate duration if both times are present
      let durationSeconds: number | null = null;
      let hourlyRateCents: number | null = null;
      let amountCents: number | null = null;

      if (stoppedAt) {
        if (stoppedAt <= startedAt) {
          throw new ValidationError('End time must be after start time');
        }

        durationSeconds = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);

        // Determine hourly rate (task > project > client)
        if (taskId) {
          const task = await ctx.loaders.taskById.load(taskId);
          if (task?.hourly_rate_cents) {
            hourlyRateCents = task.hourly_rate_cents;
          }
        }

        if (!hourlyRateCents && project.default_hourly_rate_cents) {
          hourlyRateCents = project.default_hourly_rate_cents;
        }

        if (!hourlyRateCents && project.client_id) {
          const client = await ctx.loaders.clientById.load(project.client_id);
          if (client?.default_hourly_rate_cents) {
            hourlyRateCents = client.default_hourly_rate_cents;
          }
        }

        // Calculate amount: (duration in hours) * hourly rate
        if (hourlyRateCents && billable) {
          const durationHours = durationSeconds / 3600;
          amountCents = Math.round(durationHours * hourlyRateCents);
        }
      }

      const result = await ctx.db.query<TimeEntry>(
        `
        UPDATE time_entries
        SET
          project_id = $2,
          task_id = $3,
          note = $4,
          started_at = $5,
          stopped_at = $6,
          duration_seconds = $7,
          billable = $8,
          hourly_rate_cents = $9,
          amount_cents = $10,
          client_id = $11,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [
          args.timeEntryId,
          projectId,
          taskId,
          note,
          startedAt,
          stoppedAt,
          durationSeconds,
          billable,
          hourlyRateCents,
          amountCents,
          project.client_id,
        ]
      );

      ctx.loaders.timeEntryById.clear(args.timeEntryId);
      return result.rows[0];
    },
  }),

  deleteTimeEntry: t.field({
    type: 'Boolean',
    args: {
      timeEntryId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const timeEntry = await ctx.loaders.timeEntryById.load(args.timeEntryId);
      if (!timeEntry) {
        throw new NotFoundError('Time entry not found');
      }

      await requireTeamAccess(ctx, timeEntry.team_id);

      // Team OWNER and ADMIN can delete any time entry
      // Otherwise, check project-level permissions: MANAGER can delete any, CONTRIBUTOR can delete their own
      const isTeamAdmin = ctx.auth.teamRole === 'OWNER' || ctx.auth.teamRole === 'ADMIN';

      if (!isTeamAdmin) {
        const role = await getProjectMemberRole(ctx, timeEntry.project_id);
        if (!role) {
          throw new UnauthorizedError('You do not have access to this project');
        }

        if (role === 'VIEWER') {
          throw new UnauthorizedError('Viewers cannot delete time entries');
        }

        if (role === 'CONTRIBUTOR' && timeEntry.user_id !== ctx.auth.userId) {
          throw new UnauthorizedError('Contributors can only delete their own time entries');
        }
      }

      await ctx.db.query(
        'DELETE FROM time_entries WHERE id = $1',
        [args.timeEntryId]
      );

      ctx.loaders.timeEntryById.clear(args.timeEntryId);
      return true;
    },
  }),
}));
