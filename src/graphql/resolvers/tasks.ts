import { builder } from '../schema/builder';
import { TaskRef, TaskConnection, TaskAssigneeRef } from '../schema/types';
import { TaskInput, TaskPatch } from '../schema/inputs';
import { parseOffsetLimit, buildQuery, calculatePageInfo } from '../utils';
import { NotFoundError, withErrorMapping } from '../errors';
import { requireAuth, requireTeamAccess, requireProjectRole, canViewProject } from '../context';
import { ProjectTask, TaskAssignee } from '../types';

/**
 * Task Queries
 */
builder.queryFields((t) => ({
  task: t.field({
    type: TaskRef,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const task = await ctx.loaders.taskById.load(args.id);
      if (!task) {
        return null;
      }

      // Verify access through project
      const project = await ctx.loaders.projectById.load(task.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Check if user has access to view this project
      const hasAccess = await canViewProject(ctx, task.project_id);
      if (!hasAccess) {
        return null;
      }

      return task;
    },
  }),

  tasks: t.field({
    type: TaskConnection,
    args: {
      projectId: t.arg.id({ required: true }),
      status: t.arg.string({ required: false }),
      offset: t.arg.int({ defaultValue: 0 }),
      limit: t.arg.int({ defaultValue: 25 }),
      orderBy: t.arg.string({ required: false }),
      order: t.arg.string({ defaultValue: 'asc' }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      // Verify project access
      const project = await ctx.loaders.projectById.load(args.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Check if user has access to view this project
      const hasAccess = await canViewProject(ctx, args.projectId);
      if (!hasAccess) {
        throw new NotFoundError('Project not found or access denied');
      }

      const { offset, limit } = parseOffsetLimit(args.offset, args.limit, 100);

      const filters = [
        { sql: 'project_id = $1', params: [args.projectId] },
      ];

      if (args.status) {
        filters.push({ sql: `status = $${filters.length + 1}`, params: [args.status] });
      }

      const { query, countQuery, params } = buildQuery({
        baseSelect: 'SELECT *',
        baseFrom: 'FROM project_tasks',
        filters,
        orderBy: args.orderBy,
        order: (args.order as 'asc' | 'desc') || 'asc',
        allowedOrderBy: ['order_index', 'name', 'created_at', 'updated_at'],
        defaultOrderBy: 'order_index',
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
 * Task Mutations
 */
builder.mutationFields((t) => ({
  createTask: t.field({
    type: TaskRef,
    args: {
      projectId: t.arg.id({ required: true }),
      input: t.arg({ type: TaskInput, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Only MANAGER can create tasks
      await requireProjectRole(ctx, args.projectId, ['MANAGER']);

      return withErrorMapping(async () => {
        // Get max order_index for the project
        const orderResult = await ctx.db.query(
          'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM project_tasks WHERE project_id = $1',
          [args.projectId]
        );

        const nextOrder = orderResult.rows[0].next_order;

        const result = await ctx.db.query<ProjectTask>(
          `
          INSERT INTO project_tasks (
            team_id, project_id, name, description, status, billable,
            hourly_rate_cents, tags, order_index
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
          `,
          [
            project.team_id,
            args.projectId,
            args.input.name,
            args.input.description,
            args.input.status,
            args.input.billable,
            args.input.hourlyRateCents,
            args.input.tags,
            nextOrder,
          ]
        );

        return result.rows[0];
      });
    },
  }),

  updateTask: t.field({
    type: TaskRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: TaskPatch, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const existing = await ctx.loaders.taskById.load(args.id);
      if (!existing) {
        throw new NotFoundError('Task not found');
      }

      await requireTeamAccess(ctx, existing.team_id);

      // Only MANAGER can update tasks
      await requireProjectRole(ctx, existing.project_id, ['MANAGER']);

      return withErrorMapping(async () => {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 2;

        if (args.input.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(args.input.name);
        }
        if (args.input.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(args.input.description);
        }
        if (args.input.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(args.input.status);
        }
        if (args.input.billable !== undefined) {
          updates.push(`billable = $${paramIndex++}`);
          values.push(args.input.billable);
        }
        if (args.input.hourlyRateCents !== undefined) {
          updates.push(`hourly_rate_cents = $${paramIndex++}`);
          values.push(args.input.hourlyRateCents);
        }
        if (args.input.tags !== undefined) {
          updates.push(`tags = $${paramIndex++}`);
          values.push(args.input.tags);
        }

        if (updates.length === 0) {
          return existing;
        }

        updates.push(`updated_at = NOW()`);

        const result = await ctx.db.query<ProjectTask>(
          `
          UPDATE project_tasks
          SET ${updates.join(', ')}
          WHERE id = $1
          RETURNING *
          `,
          [args.id, ...values]
        );

        ctx.loaders.taskById.clear(args.id);
        return result.rows[0];
      });
    },
  }),

  deleteTask: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const task = await ctx.loaders.taskById.load(args.id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      await requireTeamAccess(ctx, task.team_id);

      // Only MANAGER can delete tasks
      await requireProjectRole(ctx, task.project_id, ['MANAGER']);

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          'DELETE FROM project_tasks WHERE id = $1',
          [args.id]
        );

        ctx.loaders.taskById.clear(args.id);
        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),

  reorderTasks: t.field({
    type: 'Boolean',
    args: {
      projectId: t.arg.id({ required: true }),
      order: t.arg.idList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const project = await ctx.loaders.projectById.load(args.projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await requireTeamAccess(ctx, project.team_id);

      // Only MANAGER can reorder tasks
      await requireProjectRole(ctx, args.projectId, ['MANAGER']);

      // Update order_index for each task
      for (let i = 0; i < args.order.length; i++) {
        await ctx.db.query(
          'UPDATE project_tasks SET order_index = $1 WHERE id = $2 AND project_id = $3',
          [i, args.order[i], args.projectId]
        );
        ctx.loaders.taskById.clear(args.order[i]);
      }

      return true;
    },
  }),

  addTaskAssignee: t.field({
    type: TaskAssigneeRef,
    args: {
      taskId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const task = await ctx.loaders.taskById.load(args.taskId);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      await requireTeamAccess(ctx, task.team_id);

      // Only MANAGER can assign tasks
      await requireProjectRole(ctx, task.project_id, ['MANAGER']);

      return withErrorMapping(async () => {
        const result = await ctx.db.query<TaskAssignee>(
          `
          INSERT INTO task_assignees (team_id, task_id, user_id)
          VALUES ($1, $2, $3)
          RETURNING *
          `,
          [task.team_id, args.taskId, args.userId]
        );

        return result.rows[0];
      });
    },
  }),

  removeTaskAssignee: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const assignee = await ctx.loaders.taskAssigneeById.load(args.id);
      if (!assignee) {
        throw new NotFoundError('Task assignee not found');
      }

      await requireTeamAccess(ctx, assignee.team_id);

      // Get the task to check project permissions
      const task = await ctx.loaders.taskById.load(assignee.task_id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Only MANAGER can remove task assignees
      await requireProjectRole(ctx, task.project_id, ['MANAGER']);

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          'DELETE FROM task_assignees WHERE id = $1',
          [args.id]
        );

        ctx.loaders.taskAssigneeById.clear(args.id);
        return result.rowCount !== null && result.rowCount > 0;
      });
    },
  }),
}));
