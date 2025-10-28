import SchemaBuilder from '@pothos/core';
import { GraphQLContext } from '../context';
import {
  Team,
  User,
  Client,
  Project,
  ProjectTask,
  ProjectMember,
  TaskAssignee,
  TimeEntry,
  Invoice,
  InvoiceItem,
  PageInfo,
} from '../types';

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
    JSON: {
      Input: any;
      Output: any;
    };
  };
  Objects: {
    Team: Team;
    User: User;
    Client: Client;
    Project: Project;
    Task: ProjectTask;
    ProjectMember: ProjectMember;
    TaskAssignee: TaskAssignee;
    TimeEntry: TimeEntry;
    Invoice: Invoice;
    InvoiceItem: InvoiceItem;
    PageInfo: PageInfo;
  };
}>({
  plugins: [],
});

// Define Query and Mutation root types
builder.queryType({});
builder.mutationType({});

// DateTime scalar
builder.scalarType('DateTime', {
  serialize: (date) => date.toISOString(),
  parseValue: (value) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (value instanceof Date) {
      return value;
    }
    throw new Error('Invalid DateTime value');
  },
});

// JSON scalar
builder.scalarType('JSON', {
  serialize: (value) => value,
  parseValue: (value) => value,
});

// Enums
export const StatusEnum = builder.enumType('Status', {
  values: ['active', 'archived', 'completed', 'on_hold'] as const,
});

export const InvoiceStatusEnum = builder.enumType('InvoiceStatus', {
  values: ['draft', 'sent', 'paid', 'cancelled'] as const,
});

export const OrderEnum = builder.enumType('Order', {
  values: ['asc', 'desc'] as const,
});

export const TeamRoleEnum = builder.enumType('TeamRole', {
  values: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'BILLING'] as const,
});

export const ProjectRoleEnum = builder.enumType('ProjectRole', {
  values: ['MANAGER', 'CONTRIBUTOR', 'VIEWER'] as const,
});

export const InstanceRoleEnum = builder.enumType('InstanceRole', {
  values: ['USER', 'ADMIN'] as const,
});

// PageInfo type
builder.objectType(builder.objectRef<PageInfo>('PageInfo'), {
  fields: (t) => ({
    hasNextPage: t.exposeBoolean('hasNextPage'),
    nextOffset: t.exposeInt('nextOffset', { nullable: true }),
  }),
});

// Generic connection creator
export function createConnectionType<T>(
  name: string,
  nodeRef: any
) {
  return builder.objectRef<{ nodes: T[]; total: number; pageInfo: PageInfo }>(`${name}Connection`).implement({
    fields: (t) => ({
      nodes: t.field({
        type: [nodeRef],
        resolve: (parent) => parent.nodes,
      }),
      total: t.exposeInt('total'),
      pageInfo: t.field({
        type: 'PageInfo',
        resolve: (parent) => parent.pageInfo,
      }),
    }),
  });
}
