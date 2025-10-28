import { builder } from './builder';

// List arguments
export const ListArgsInput = builder.inputType('ListArgs', {
  fields: (t) => ({
    teamId: t.id({ required: true }),
    offset: t.int({ defaultValue: 0 }),
    limit: t.int({ defaultValue: 25 }),
    search: t.string({ required: false }),
    status: t.string({ required: false }),
    from: t.field({ type: 'DateTime', required: false }),
    to: t.field({ type: 'DateTime', required: false }),
    orderBy: t.string({ required: false }),
    order: t.string({ defaultValue: 'desc' }),
  }),
});

// Client inputs
export const ClientInput = builder.inputType('ClientInput', {
  fields: (t) => ({
    teamId: t.id({ required: true }),
    name: t.string({ required: true }),
    email: t.string({ required: false }),
    phone: t.string({ required: false }),
    notes: t.string({ required: false }),
    contactName: t.string({ required: false }),
    billingAddress: t.field({ type: 'JSON', required: false }),
    taxId: t.string({ required: false }),
    defaultHourlyRateCents: t.int({ required: false }),
    currency: t.string({ defaultValue: 'USD' }),
  }),
});

export const ClientPatch = builder.inputType('ClientPatch', {
  fields: (t) => ({
    name: t.string({ required: false }),
    email: t.string({ required: false }),
    phone: t.string({ required: false }),
    notes: t.string({ required: false }),
    contactName: t.string({ required: false }),
    billingAddress: t.field({ type: 'JSON', required: false }),
    taxId: t.string({ required: false }),
    defaultHourlyRateCents: t.int({ required: false }),
    currency: t.string({ required: false }),
  }),
});

// Project inputs
export const ProjectInput = builder.inputType('ProjectInput', {
  fields: (t) => ({
    teamId: t.id({ required: true }),
    clientId: t.id({ required: false }),
    name: t.string({ required: true }),
    description: t.string({ required: false }),
    code: t.string({ required: false }),
    status: t.string({ defaultValue: 'active' }),
    color: t.string({ required: false }),
    tags: t.stringList({ defaultValue: [] }),
    defaultHourlyRateCents: t.int({ required: false }),
    budgetType: t.string({ required: false }),
    budgetHours: t.float({ required: false }),
    budgetAmountCents: t.int({ required: false }),
    startDate: t.field({ type: 'DateTime', required: false }),
    dueDate: t.field({ type: 'DateTime', required: false }),
  }),
});

export const ProjectPatch = builder.inputType('ProjectPatch', {
  fields: (t) => ({
    clientId: t.id({ required: false }),
    name: t.string({ required: false }),
    description: t.string({ required: false }),
    code: t.string({ required: false }),
    status: t.string({ required: false }),
    color: t.string({ required: false }),
    tags: t.stringList({ required: false }),
    defaultHourlyRateCents: t.int({ required: false }),
    budgetType: t.string({ required: false }),
    budgetHours: t.float({ required: false }),
    budgetAmountCents: t.int({ required: false }),
    startDate: t.field({ type: 'DateTime', required: false }),
    dueDate: t.field({ type: 'DateTime', required: false }),
  }),
});

// Task inputs
export const TaskInput = builder.inputType('TaskInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: false }),
    status: t.string({ defaultValue: 'active' }),
    billable: t.boolean({ defaultValue: true }),
    hourlyRateCents: t.int({ required: false }),
    tags: t.stringList({ defaultValue: [] }),
  }),
});

export const TaskPatch = builder.inputType('TaskPatch', {
  fields: (t) => ({
    name: t.string({ required: false }),
    description: t.string({ required: false }),
    status: t.string({ required: false }),
    billable: t.boolean({ required: false }),
    hourlyRateCents: t.int({ required: false }),
    tags: t.stringList({ required: false }),
  }),
});

// Invoice inputs
export const InvoiceInput = builder.inputType('InvoiceInput', {
  fields: (t) => ({
    teamId: t.id({ required: true }),
    clientId: t.id({ required: true }),
    invoiceNumber: t.string({ required: true }),
    status: t.string({ defaultValue: 'draft' }),
    issuedDate: t.field({ type: 'DateTime', required: true }),
    dueDate: t.field({ type: 'DateTime', required: true }),
    taxRatePercent: t.float({ defaultValue: 0 }),
    notes: t.string({ required: false }),
  }),
});

export const InvoicePatch = builder.inputType('InvoicePatch', {
  fields: (t) => ({
    invoiceNumber: t.string({ required: false }),
    status: t.string({ required: false }),
    issuedDate: t.field({ type: 'DateTime', required: false }),
    dueDate: t.field({ type: 'DateTime', required: false }),
    taxRatePercent: t.float({ required: false }),
    notes: t.string({ required: false }),
  }),
});

export const InvoiceItemInput = builder.inputType('InvoiceItemInput', {
  fields: (t) => ({
    timeEntryIds: t.idList({ required: false }),
    description: t.string({ required: true }),
    quantity: t.float({ required: true }),
    rateCents: t.int({ required: true }),
  }),
});

export const InvoiceItemPatch = builder.inputType('InvoiceItemPatch', {
  fields: (t) => ({
    description: t.string({ required: false }),
    quantity: t.float({ required: false }),
    rateCents: t.int({ required: false }),
  }),
});
