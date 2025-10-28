import DataLoader from 'dataloader';
import { QueryResult } from 'pg';
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
} from '../types';

type QueryFunction = (text: string, params?: any[]) => Promise<QueryResult<any>>;

/**
 * Generic loader for single entities by ID
 */
function createByIdLoader<T extends { id: string }>(
  query: QueryFunction,
  tableName: string
): DataLoader<string, T | null> {
  return new DataLoader<string, T | null>(async (ids) => {
    const result = await query(
      `SELECT * FROM ${tableName} WHERE id = ANY($1)`,
      [ids]
    );

    const rowsById = new Map<string, T>();
    result.rows.forEach((row) => {
      rowsById.set(row.id, row as T);
    });

    return ids.map((id) => rowsById.get(id) || null);
  });
}

/**
 * Generic loader for arrays of entities by foreign key
 */
function createByForeignKeyLoader<T>(
  query: QueryFunction,
  tableName: string,
  foreignKeyColumn: string
): DataLoader<string, T[]> {
  return new DataLoader<string, T[]>(async (foreignIds) => {
    const result = await query(
      `SELECT * FROM ${tableName} WHERE ${foreignKeyColumn} = ANY($1)`,
      [foreignIds]
    );

    const rowsByForeignId = new Map<string, T[]>();
    foreignIds.forEach((id) => rowsByForeignId.set(id, []));

    result.rows.forEach((row) => {
      const foreignId = row[foreignKeyColumn];
      if (!rowsByForeignId.has(foreignId)) {
        rowsByForeignId.set(foreignId, []);
      }
      rowsByForeignId.get(foreignId)!.push(row as T);
    });

    return foreignIds.map((id) => rowsByForeignId.get(id) || []);
  });
}

export interface Loaders {
  // By ID loaders
  teamById: DataLoader<string, Team | null>;
  userById: DataLoader<string, User | null>;
  clientById: DataLoader<string, Client | null>;
  projectById: DataLoader<string, Project | null>;
  taskById: DataLoader<string, ProjectTask | null>;
  timeEntryById: DataLoader<string, TimeEntry | null>;
  invoiceById: DataLoader<string, Invoice | null>;
  invoiceItemById: DataLoader<string, InvoiceItem | null>;
  projectMemberById: DataLoader<string, ProjectMember | null>;
  taskAssigneeById: DataLoader<string, TaskAssignee | null>;

  // By foreign key loaders
  projectsByClientId: DataLoader<string, Project[]>;
  tasksByProjectId: DataLoader<string, ProjectTask[]>;
  invoicesByClientId: DataLoader<string, Invoice[]>;
  membersByProjectId: DataLoader<string, ProjectMember[]>;
  assigneesByTaskId: DataLoader<string, TaskAssignee[]>;
  invoiceItemsByInvoiceId: DataLoader<string, InvoiceItem[]>;
  timeEntriesByProjectId: DataLoader<string, TimeEntry[]>;
  timeEntriesByTaskId: DataLoader<string, TimeEntry[]>;
  timeEntriesByClientId: DataLoader<string, TimeEntry[]>;
}

/**
 * Creates all DataLoaders for a request
 */
export function createLoaders(query: QueryFunction): Loaders {
  return {
    // By ID loaders
    teamById: createByIdLoader<Team>(query, 'teams'),
    userById: createByIdLoader<User>(query, 'users'),
    clientById: createByIdLoader<Client>(query, 'clients'),
    projectById: createByIdLoader<Project>(query, 'projects'),
    taskById: createByIdLoader<ProjectTask>(query, 'project_tasks'),
    timeEntryById: createByIdLoader<TimeEntry>(query, 'time_entries'),
    invoiceById: createByIdLoader<Invoice>(query, 'invoices'),
    invoiceItemById: createByIdLoader<InvoiceItem>(query, 'invoice_items'),
    projectMemberById: createByIdLoader<ProjectMember>(query, 'project_members'),
    taskAssigneeById: createByIdLoader<TaskAssignee>(query, 'task_assignees'),

    // By foreign key loaders
    projectsByClientId: createByForeignKeyLoader<Project>(query, 'projects', 'client_id'),
    tasksByProjectId: createByForeignKeyLoader<ProjectTask>(query, 'project_tasks', 'project_id'),
    invoicesByClientId: createByForeignKeyLoader<Invoice>(query, 'invoices', 'client_id'),
    membersByProjectId: createByForeignKeyLoader<ProjectMember>(query, 'project_members', 'project_id'),
    assigneesByTaskId: createByForeignKeyLoader<TaskAssignee>(query, 'task_assignees', 'task_id'),
    invoiceItemsByInvoiceId: createByForeignKeyLoader<InvoiceItem>(query, 'invoice_items', 'invoice_id'),
    timeEntriesByProjectId: createByForeignKeyLoader<TimeEntry>(query, 'time_entries', 'project_id'),
    timeEntriesByTaskId: createByForeignKeyLoader<TimeEntry>(query, 'time_entries', 'task_id'),
    timeEntriesByClientId: createByForeignKeyLoader<TimeEntry>(query, 'time_entries', 'client_id'),
  };
}
