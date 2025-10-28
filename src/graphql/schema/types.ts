import { builder, createConnectionType, StatusEnum, InvoiceStatusEnum, InstanceRoleEnum, ProjectRoleEnum, OrderEnum } from './builder';
import { Client, Project, ProjectTask, TimeEntry, Invoice, InvoiceItem, Team, User, ProjectMember, TaskAssignee, TeamMembership } from '../types';
import { parseOffsetLimit, buildQuery, calculatePageInfo } from '../utils';
import { NotFoundError } from '../errors';

// Team type
export const TeamRef = builder.objectRef<Team>('Team');
TeamRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    billingAddress: t.expose('billing_address', { type: 'JSON', nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
  }),
});

// TeamMember type
export const TeamMemberRef = builder.objectRef<TeamMembership>('TeamMember');
TeamMemberRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    teamId: t.exposeID('team_id'),
    userId: t.exposeID('user_id'),
    role: t.exposeString('role'),
    user: t.field({
      type: UserRef,
      resolve: async (parent, _args, ctx) => {
        const user = await ctx.loaders.userById.load(parent.user_id);
        if (!user) throw new NotFoundError('User not found');
        return user;
      },
    }),
  }),
});

// User type
export const UserRef = builder.objectRef<User>('User');
UserRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name'),
    displayName: t.exposeString('display_name', { nullable: true }),
    instanceRole: t.expose('instance_role', { type: InstanceRoleEnum }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
  }),
});

// ProjectMember type
export const ProjectMemberRef = builder.objectRef<ProjectMember>('ProjectMember');
ProjectMemberRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('project_id'),
    userId: t.exposeID('user_id'),
    role: t.expose('role', { type: ProjectRoleEnum }),
    user: t.field({
      type: UserRef,
      resolve: async (parent, _args, ctx) => {
        const user = await ctx.loaders.userById.load(parent.user_id);
        if (!user) throw new NotFoundError('User not found');
        return user;
      },
    }),
  }),
});

// TaskAssignee type
export const TaskAssigneeRef = builder.objectRef<TaskAssignee>('TaskAssignee');
TaskAssigneeRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    taskId: t.exposeID('task_id'),
    userId: t.exposeID('user_id'),
    user: t.field({
      type: UserRef,
      resolve: async (parent, _args, ctx) => {
        const user = await ctx.loaders.userById.load(parent.user_id);
        if (!user) throw new NotFoundError('User not found');
        return user;
      },
    }),
  }),
});

// Task type
export const TaskRef = builder.objectRef<ProjectTask>('Task');
TaskRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('project_id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    status: t.expose('status', { type: StatusEnum }),
    billable: t.exposeBoolean('billable'),
    hourlyRateCents: t.exposeInt('hourly_rate_cents', { nullable: true }),
    tags: t.exposeStringList('tags'),
    orderIndex: t.exposeInt('order_index', { nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
    project: t.field({
      type: ProjectRef,
      resolve: async (parent, _args, ctx) => {
        const project = await ctx.loaders.projectById.load(parent.project_id);
        if (!project) throw new NotFoundError('Project not found');
        return project;
      },
    }),
    assignees: t.field({
      type: [TaskAssigneeRef],
      resolve: async (parent, _args, ctx) => {
        return ctx.loaders.assigneesByTaskId.load(parent.id);
      },
    }),
  }),
});

export const TaskConnection = createConnectionType<ProjectTask>('Task', TaskRef);

// InvoiceItem type
export const InvoiceItemRef = builder.objectRef<InvoiceItem>('InvoiceItem');
InvoiceItemRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    invoiceId: t.exposeID('invoice_id'),
    timeEntryId: t.exposeID('time_entry_id', { nullable: true }),
    description: t.exposeString('description'),
    quantity: t.exposeFloat('quantity'),
    rateCents: t.exposeInt('rate_cents'),
    amountCents: t.exposeInt('amount_cents'),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    timeEntries: t.field({
      type: [TimeEntryRef],
      resolve: async (parent, _args, ctx) => {
        const result = await ctx.db.query(
          `
          SELECT te.*
          FROM time_entries te
          JOIN invoice_time_entries ite ON ite.time_entry_id = te.id
          WHERE ite.invoice_item_id = $1
          ORDER BY te.started_at ASC
          `,
          [parent.id]
        );
        return result.rows;
      },
    }),
  }),
});

// Invoice type
export const InvoiceRef = builder.objectRef<Invoice>('Invoice');
InvoiceRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    clientId: t.exposeID('client_id'),
    invoiceNumber: t.exposeString('invoice_number'),
    status: t.expose('status', { type: InvoiceStatusEnum }),
    issuedDate: t.expose('issued_date', { type: 'DateTime' }),
    dueDate: t.expose('due_date', { type: 'DateTime' }),
    subtotalCents: t.exposeInt('subtotal_cents'),
    taxRatePercent: t.exposeFloat('tax_rate_percent'),
    taxAmountCents: t.exposeInt('tax_amount_cents'),
    totalCents: t.exposeInt('total_cents'),
    notes: t.exposeString('notes', { nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
    items: t.field({
      type: [InvoiceItemRef],
      resolve: async (parent, _args, ctx) => {
        return ctx.loaders.invoiceItemsByInvoiceId.load(parent.id);
      },
    }),
    client: t.field({
      type: 'Client',
      resolve: async (parent, _args, ctx) => {
        const client = await ctx.loaders.clientById.load(parent.client_id);
        if (!client) throw new NotFoundError('Client not found');
        return client;
      },
    }),
    team: t.field({
      type: 'Team',
      resolve: async (parent, _args, ctx) => {
        const team = await ctx.loaders.teamById.load(parent.team_id);
        if (!team) throw new NotFoundError('Team not found');
        return team;
      },
    }),
    timeEntries: t.field({
      type: [TimeEntryRef],
      resolve: async (parent, _args, ctx) => {
        const result = await ctx.db.query(
          `
          SELECT te.*
          FROM time_entries te
          JOIN invoice_time_entries ite ON ite.time_entry_id = te.id
          WHERE ite.invoice_id = $1
          ORDER BY te.started_at ASC
          `,
          [parent.id]
        );
        return result.rows;
      },
    }),
  }),
});

export const InvoiceConnection = createConnectionType<Invoice>('Invoice', InvoiceRef);

// TimeEntry type
export const TimeEntryRef = builder.objectRef<TimeEntry>('TimeEntry');
TimeEntryRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('project_id'),
    taskId: t.exposeID('task_id', { nullable: true }),
    userId: t.exposeID('user_id', { nullable: true }),
    clientId: t.exposeID('client_id', { nullable: true }),
    note: t.exposeString('note', { nullable: true }),
    startedAt: t.expose('started_at', { type: 'DateTime' }),
    stoppedAt: t.expose('stopped_at', { type: 'DateTime', nullable: true }),
    durationSeconds: t.exposeInt('duration_seconds', { nullable: true }),
    billable: t.exposeBoolean('billable'),
    hourlyRateCents: t.exposeInt('hourly_rate_cents', { nullable: true }),
    amountCents: t.exposeInt('amount_cents', { nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
    project: t.field({
      type: 'Project',
      resolve: async (parent, _args, ctx) => {
        const project = await ctx.loaders.projectById.load(parent.project_id);
        if (!project) throw new NotFoundError('Project not found');
        return project;
      },
    }),
    task: t.field({
      type: TaskRef,
      nullable: true,
      resolve: async (parent, _args, ctx) => {
        if (!parent.task_id) return null;
        return ctx.loaders.taskById.load(parent.task_id);
      },
    }),
    user: t.field({
      type: UserRef,
      nullable: true,
      resolve: async (parent, _args, ctx) => {
        if (!parent.user_id) return null;
        return ctx.loaders.userById.load(parent.user_id);
      },
    }),
  }),
});

export const TimeEntryConnection = createConnectionType<TimeEntry>('TimeEntry', TimeEntryRef);

// Project type
export const ProjectRef = builder.objectRef<Project>('Project');
ProjectRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    teamId: t.exposeID('team_id'),
    clientId: t.exposeID('client_id', { nullable: true }),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    code: t.exposeString('code', { nullable: true }),
    status: t.expose('status', { type: StatusEnum }),
    color: t.exposeString('color', { nullable: true }),
    tags: t.exposeStringList('tags'),
    defaultHourlyRateCents: t.exposeInt('default_hourly_rate_cents', { nullable: true }),
    budgetType: t.exposeString('budget_type', { nullable: true }),
    budgetHours: t.exposeFloat('budget_hours', { nullable: true }),
    budgetAmountCents: t.exposeInt('budget_amount_cents', { nullable: true }),
    startDate: t.expose('start_date', { type: 'DateTime', nullable: true }),
    dueDate: t.expose('due_date', { type: 'DateTime', nullable: true }),
    archivedAt: t.expose('archived_at', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
    client: t.field({
      type: 'Client',
      nullable: true,
      resolve: async (parent, _args, ctx) => {
        if (!parent.client_id) return null;
        return ctx.loaders.clientById.load(parent.client_id);
      },
    }),
    tasks: t.field({
      type: TaskConnection,
      args: {
        status: t.arg({ type: StatusEnum, required: false }),
        offset: t.arg.int({ defaultValue: 0 }),
        limit: t.arg.int({ defaultValue: 25 }),
        orderBy: t.arg.string({ required: false }),
        order: t.arg({ type: OrderEnum, defaultValue: 'asc' }),
      },
      resolve: async (parent, args, ctx) => {
        const { offset, limit } = parseOffsetLimit(args.offset, args.limit, 100);

        const filters = [
          { sql: 'project_id = $1', params: [parent.id] },
        ];

        if (args.status) {
          filters.push({ sql: `status = $${filters.length + 1}`, params: [args.status] });
        }

        const { query, countQuery, params } = buildQuery({
          baseSelect: 'SELECT *',
          baseFrom: 'FROM project_tasks',
          filters,
          orderBy: args.orderBy,
          order: args.order,
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
    members: t.field({
      type: [ProjectMemberRef],
      resolve: async (parent, _args, ctx) => {
        return ctx.loaders.membersByProjectId.load(parent.id);
      },
    }),
  }),
});

export const ProjectConnection = createConnectionType<Project>('Project', ProjectRef);

// Client type
export const ClientRef = builder.objectRef<Client>('Client');
ClientRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    teamId: t.exposeID('team_id'),
    name: t.exposeString('name'),
    email: t.exposeString('email', { nullable: true }),
    phone: t.exposeString('phone', { nullable: true }),
    notes: t.exposeString('notes', { nullable: true }),
    contactName: t.exposeString('contact_name', { nullable: true }),
    billingAddress: t.expose('billing_address', { type: 'JSON', nullable: true }),
    taxId: t.exposeString('tax_id', { nullable: true }),
    defaultHourlyRateCents: t.exposeInt('default_hourly_rate_cents', { nullable: true }),
    currency: t.exposeString('currency'),
    archivedAt: t.expose('archived_at', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
    updatedAt: t.expose('updated_at', { type: 'DateTime' }),
    projects: t.field({
      type: ProjectConnection,
      args: {
        status: t.arg({ type: StatusEnum, required: false }),
        offset: t.arg.int({ defaultValue: 0 }),
        limit: t.arg.int({ defaultValue: 25 }),
        orderBy: t.arg.string({ required: false }),
        order: t.arg({ type: OrderEnum, defaultValue: 'desc' }),
      },
      resolve: async (parent, args, ctx) => {
        const { offset, limit } = parseOffsetLimit(args.offset, args.limit, 100);

        const filters = [
          { sql: 'client_id = $1', params: [parent.id] },
        ];

        if (args.status) {
          filters.push({ sql: `status = $${filters.length + 1}`, params: [args.status] });
        }

        const { query, countQuery, params } = buildQuery({
          baseSelect: 'SELECT *',
          baseFrom: 'FROM projects',
          filters,
          orderBy: args.orderBy,
          order: args.order,
          allowedOrderBy: ['name', 'created_at', 'updated_at', 'start_date', 'due_date'],
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
    invoices: t.field({
      type: InvoiceConnection,
      args: {
        status: t.arg({ type: InvoiceStatusEnum, required: false }),
        from: t.arg({ type: 'DateTime', required: false }),
        to: t.arg({ type: 'DateTime', required: false }),
        offset: t.arg.int({ defaultValue: 0 }),
        limit: t.arg.int({ defaultValue: 25 }),
        orderBy: t.arg.string({ required: false }),
        order: t.arg({ type: OrderEnum, defaultValue: 'desc' }),
      },
      resolve: async (parent, args, ctx) => {
        const { offset, limit } = parseOffsetLimit(args.offset, args.limit, 100);

        const filters = [
          { sql: 'client_id = $1', params: [parent.id] },
        ];

        if (args.status) {
          filters.push({ sql: `status = $${filters.length + 1}`, params: [args.status] });
        }

        const { query, countQuery, params } = buildQuery({
          baseSelect: 'SELECT *',
          baseFrom: 'FROM invoices',
          filters,
          dateRange: args.from || args.to ? { from: args.from, to: args.to, field: 'issued_date' } : undefined,
          orderBy: args.orderBy,
          order: args.order,
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
  }),
});

export const ClientConnection = createConnectionType<Client>('Client', ClientRef);
