import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { Team, User, Client, Project, ProjectTask, TimeEntry, Invoice, InvoiceItem, ProjectMember, TaskAssignee, PageInfo } from '@/graphql/types';
import type { GraphQLContext } from '@/graphql/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date; output: Date; }
  JSON: { input: any; output: any; }
};

export type Client = {
  __typename?: 'Client';
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  billingAddress?: Maybe<Scalars['JSON']['output']>;
  contactName?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  currency?: Maybe<Scalars['String']['output']>;
  defaultHourlyRateCents?: Maybe<Scalars['Int']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  invoices?: Maybe<InvoiceConnection>;
  name?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  projects?: Maybe<ProjectConnection>;
  taxId?: Maybe<Scalars['String']['output']>;
  teamId?: Maybe<Scalars['ID']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type ClientInvoicesArgs = {
  from?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InvoiceStatus>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
};


export type ClientProjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Status>;
};

export type ClientConnection = {
  __typename?: 'ClientConnection';
  nodes?: Maybe<Array<Client>>;
  pageInfo?: Maybe<PageInfo>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type ClientInput = {
  billingAddress?: InputMaybe<Scalars['JSON']['input']>;
  contactName?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  defaultHourlyRateCents?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  taxId?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
};

export type ClientPatch = {
  billingAddress?: InputMaybe<Scalars['JSON']['input']>;
  contactName?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  defaultHourlyRateCents?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  taxId?: InputMaybe<Scalars['String']['input']>;
};

export enum InstanceRole {
  Admin = 'ADMIN',
  User = 'USER'
}

export type Invoice = {
  __typename?: 'Invoice';
  client?: Maybe<Client>;
  clientId?: Maybe<Scalars['ID']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  invoiceNumber?: Maybe<Scalars['String']['output']>;
  issuedDate?: Maybe<Scalars['DateTime']['output']>;
  items?: Maybe<Array<InvoiceItem>>;
  notes?: Maybe<Scalars['String']['output']>;
  status?: Maybe<InvoiceStatus>;
  subtotalCents?: Maybe<Scalars['Int']['output']>;
  taxAmountCents?: Maybe<Scalars['Int']['output']>;
  taxRatePercent?: Maybe<Scalars['Float']['output']>;
  team?: Maybe<Team>;
  timeEntries?: Maybe<Array<TimeEntry>>;
  totalCents?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type InvoiceConnection = {
  __typename?: 'InvoiceConnection';
  nodes?: Maybe<Array<Invoice>>;
  pageInfo?: Maybe<PageInfo>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type InvoiceInput = {
  clientId: Scalars['ID']['input'];
  dueDate: Scalars['DateTime']['input'];
  invoiceNumber: Scalars['String']['input'];
  issuedDate: Scalars['DateTime']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InvoiceStatus>;
  taxRatePercent?: InputMaybe<Scalars['Float']['input']>;
  teamId: Scalars['ID']['input'];
};

export type InvoiceItem = {
  __typename?: 'InvoiceItem';
  amountCents?: Maybe<Scalars['Int']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  invoiceId?: Maybe<Scalars['ID']['output']>;
  quantity?: Maybe<Scalars['Float']['output']>;
  rateCents?: Maybe<Scalars['Int']['output']>;
  timeEntries?: Maybe<Array<TimeEntry>>;
  timeEntryId?: Maybe<Scalars['ID']['output']>;
};

export type InvoiceItemInput = {
  description: Scalars['String']['input'];
  quantity: Scalars['Float']['input'];
  rateCents: Scalars['Int']['input'];
  timeEntryIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type InvoiceItemPatch = {
  description?: InputMaybe<Scalars['String']['input']>;
  quantity?: InputMaybe<Scalars['Float']['input']>;
  rateCents?: InputMaybe<Scalars['Int']['input']>;
};

export type InvoicePatch = {
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  invoiceNumber?: InputMaybe<Scalars['String']['input']>;
  issuedDate?: InputMaybe<Scalars['DateTime']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InvoiceStatus>;
  taxRatePercent?: InputMaybe<Scalars['Float']['input']>;
};

export enum InvoiceStatus {
  Cancelled = 'cancelled',
  Draft = 'draft',
  Paid = 'paid',
  Sent = 'sent'
}

export type ListArgs = {
  from?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  to?: InputMaybe<Scalars['DateTime']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addInvoiceItem?: Maybe<InvoiceItem>;
  addProjectMember?: Maybe<ProjectMember>;
  addTaskAssignee?: Maybe<TaskAssignee>;
  addTimeEntriesToInvoiceItem?: Maybe<Scalars['Boolean']['output']>;
  archiveClient?: Maybe<Client>;
  cancelInvoice?: Maybe<Invoice>;
  createClient?: Maybe<Client>;
  createInvoice?: Maybe<Invoice>;
  createProject?: Maybe<Project>;
  createTask?: Maybe<Task>;
  createTimeEntry?: Maybe<TimeEntry>;
  deleteClient?: Maybe<Scalars['Boolean']['output']>;
  deleteInvoice?: Maybe<Scalars['Boolean']['output']>;
  deleteTask?: Maybe<Scalars['Boolean']['output']>;
  deleteTimeEntry?: Maybe<Scalars['Boolean']['output']>;
  markInvoicePaid?: Maybe<Invoice>;
  markInvoiceSent?: Maybe<Invoice>;
  removeInvoiceItem?: Maybe<Scalars['Boolean']['output']>;
  removeProjectMember?: Maybe<Scalars['Boolean']['output']>;
  removeTaskAssignee?: Maybe<Scalars['Boolean']['output']>;
  removeTimeEntryFromInvoice?: Maybe<Scalars['Boolean']['output']>;
  reorderTasks?: Maybe<Scalars['Boolean']['output']>;
  setProjectStatus?: Maybe<Project>;
  startTimer?: Maybe<TimeEntry>;
  stopTimer?: Maybe<TimeEntry>;
  unarchiveClient?: Maybe<Client>;
  updateClient?: Maybe<Client>;
  updateInvoice?: Maybe<Invoice>;
  updateInvoiceItem?: Maybe<InvoiceItem>;
  updateProject?: Maybe<Project>;
  updateProjectMember?: Maybe<ProjectMember>;
  updateTask?: Maybe<Task>;
  updateTimeEntry?: Maybe<TimeEntry>;
  updateUserPassword?: Maybe<Scalars['Boolean']['output']>;
  updateUserProfile?: Maybe<User>;
};


export type MutationAddInvoiceItemArgs = {
  input: InvoiceItemInput;
  invoiceId: Scalars['ID']['input'];
};


export type MutationAddProjectMemberArgs = {
  projectId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAddTaskAssigneeArgs = {
  taskId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAddTimeEntriesToInvoiceItemArgs = {
  invoiceItemId: Scalars['ID']['input'];
  timeEntryIds: Array<Scalars['ID']['input']>;
};


export type MutationArchiveClientArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelInvoiceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateClientArgs = {
  input: ClientInput;
};


export type MutationCreateInvoiceArgs = {
  input: InvoiceInput;
};


export type MutationCreateProjectArgs = {
  input: ProjectInput;
};


export type MutationCreateTaskArgs = {
  input: TaskInput;
  projectId: Scalars['ID']['input'];
};


export type MutationCreateTimeEntryArgs = {
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
  startedAt: Scalars['DateTime']['input'];
  stoppedAt: Scalars['DateTime']['input'];
  taskId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationDeleteClientArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteInvoiceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTimeEntryArgs = {
  timeEntryId: Scalars['ID']['input'];
};


export type MutationMarkInvoicePaidArgs = {
  id: Scalars['ID']['input'];
};


export type MutationMarkInvoiceSentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveInvoiceItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveProjectMemberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTaskAssigneeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTimeEntryFromInvoiceArgs = {
  invoiceId: Scalars['ID']['input'];
  timeEntryId: Scalars['ID']['input'];
};


export type MutationReorderTasksArgs = {
  order: Array<Scalars['ID']['input']>;
  projectId: Scalars['ID']['input'];
};


export type MutationSetProjectStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


export type MutationStartTimerArgs = {
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
  taskId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationStopTimerArgs = {
  timeEntryId: Scalars['ID']['input'];
};


export type MutationUnarchiveClientArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateClientArgs = {
  id: Scalars['ID']['input'];
  input: ClientPatch;
};


export type MutationUpdateInvoiceArgs = {
  id: Scalars['ID']['input'];
  input: InvoicePatch;
};


export type MutationUpdateInvoiceItemArgs = {
  id: Scalars['ID']['input'];
  input: InvoiceItemPatch;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: ProjectPatch;
};


export type MutationUpdateProjectMemberArgs = {
  id: Scalars['ID']['input'];
  role: Scalars['String']['input'];
};


export type MutationUpdateTaskArgs = {
  id: Scalars['ID']['input'];
  input: TaskPatch;
};


export type MutationUpdateTimeEntryArgs = {
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  startedAt?: InputMaybe<Scalars['DateTime']['input']>;
  stoppedAt?: InputMaybe<Scalars['DateTime']['input']>;
  taskId?: InputMaybe<Scalars['ID']['input']>;
  timeEntryId: Scalars['ID']['input'];
};


export type MutationUpdateUserPasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationUpdateUserProfileArgs = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export enum Order {
  Asc = 'asc',
  Desc = 'desc'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage?: Maybe<Scalars['Boolean']['output']>;
  nextOffset?: Maybe<Scalars['Int']['output']>;
};

export type Project = {
  __typename?: 'Project';
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  budgetAmountCents?: Maybe<Scalars['Int']['output']>;
  budgetHours?: Maybe<Scalars['Float']['output']>;
  budgetType?: Maybe<Scalars['String']['output']>;
  client?: Maybe<Client>;
  clientId?: Maybe<Scalars['ID']['output']>;
  code?: Maybe<Scalars['String']['output']>;
  color?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  defaultHourlyRateCents?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  members?: Maybe<Array<ProjectMember>>;
  name?: Maybe<Scalars['String']['output']>;
  startDate?: Maybe<Scalars['DateTime']['output']>;
  status?: Maybe<Status>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  tasks?: Maybe<TaskConnection>;
  teamId?: Maybe<Scalars['ID']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


export type ProjectTasksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Status>;
};

export type ProjectConnection = {
  __typename?: 'ProjectConnection';
  nodes?: Maybe<Array<Project>>;
  pageInfo?: Maybe<PageInfo>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type ProjectInput = {
  budgetAmountCents?: InputMaybe<Scalars['Int']['input']>;
  budgetHours?: InputMaybe<Scalars['Float']['input']>;
  budgetType?: InputMaybe<Scalars['String']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  defaultHourlyRateCents?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<Status>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  teamId: Scalars['ID']['input'];
};

export type ProjectMember = {
  __typename?: 'ProjectMember';
  id?: Maybe<Scalars['ID']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
  role?: Maybe<ProjectRole>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type ProjectPatch = {
  budgetAmountCents?: InputMaybe<Scalars['Int']['input']>;
  budgetHours?: InputMaybe<Scalars['Float']['input']>;
  budgetType?: InputMaybe<Scalars['String']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  defaultHourlyRateCents?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<Status>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum ProjectRole {
  Contributor = 'CONTRIBUTOR',
  Manager = 'MANAGER',
  Viewer = 'VIEWER'
}

export type Query = {
  __typename?: 'Query';
  client?: Maybe<Client>;
  clients?: Maybe<ClientConnection>;
  invoice?: Maybe<Invoice>;
  invoices?: Maybe<InvoiceConnection>;
  me?: Maybe<User>;
  project?: Maybe<Project>;
  projects?: Maybe<ProjectConnection>;
  searchClients?: Maybe<Array<Client>>;
  task?: Maybe<Task>;
  tasks?: Maybe<TaskConnection>;
  teamMembers?: Maybe<Array<TeamMember>>;
  timeEntries?: Maybe<TimeEntryConnection>;
};


export type QueryClientArgs = {
  id: Scalars['ID']['input'];
  teamId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryClientsArgs = {
  args: ListArgs;
};


export type QueryInvoiceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInvoicesArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  teamId: Scalars['ID']['input'];
  to?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectsArgs = {
  args: ListArgs;
};


export type QuerySearchClientsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  q: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTasksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTeamMembersArgs = {
  teamId: Scalars['ID']['input'];
};


export type QueryTimeEntriesArgs = {
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  taskId?: InputMaybe<Scalars['ID']['input']>;
  teamId: Scalars['ID']['input'];
  to?: InputMaybe<Scalars['DateTime']['input']>;
  uninvoicedOnly?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export enum Status {
  Active = 'active',
  Archived = 'archived',
  Completed = 'completed',
  OnHold = 'on_hold'
}

export type Task = {
  __typename?: 'Task';
  assignees?: Maybe<Array<TaskAssignee>>;
  billable?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  hourlyRateCents?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  orderIndex?: Maybe<Scalars['Int']['output']>;
  project?: Maybe<Project>;
  projectId?: Maybe<Scalars['ID']['output']>;
  status?: Maybe<Status>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TaskAssignee = {
  __typename?: 'TaskAssignee';
  id?: Maybe<Scalars['ID']['output']>;
  taskId?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type TaskConnection = {
  __typename?: 'TaskConnection';
  nodes?: Maybe<Array<Task>>;
  pageInfo?: Maybe<PageInfo>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type TaskInput = {
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  hourlyRateCents?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  status?: InputMaybe<Status>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type TaskPatch = {
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  hourlyRateCents?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Status>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Team = {
  __typename?: 'Team';
  billingAddress?: Maybe<Scalars['JSON']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TeamMember = {
  __typename?: 'TeamMember';
  id?: Maybe<Scalars['ID']['output']>;
  teamId?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export enum TeamRole {
  Admin = 'ADMIN',
  Billing = 'BILLING',
  Member = 'MEMBER',
  Owner = 'OWNER',
  Viewer = 'VIEWER'
}

export type TimeEntry = {
  __typename?: 'TimeEntry';
  amountCents?: Maybe<Scalars['Int']['output']>;
  billable?: Maybe<Scalars['Boolean']['output']>;
  clientId?: Maybe<Scalars['ID']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  durationSeconds?: Maybe<Scalars['Int']['output']>;
  hourlyRateCents?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  project?: Maybe<Project>;
  projectId?: Maybe<Scalars['ID']['output']>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  stoppedAt?: Maybe<Scalars['DateTime']['output']>;
  task?: Maybe<Task>;
  taskId?: Maybe<Scalars['ID']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type TimeEntryConnection = {
  __typename?: 'TimeEntryConnection';
  nodes?: Maybe<Array<TimeEntry>>;
  pageInfo?: Maybe<PageInfo>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type User = {
  __typename?: 'User';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  instanceRole?: Maybe<InstanceRole>;
  name?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ListClientsQueryVariables = Exact<{
  args: ListArgs;
}>;


export type ListClientsQuery = { __typename?: 'Query', clients?: { __typename?: 'ClientConnection', total?: number | null, nodes?: Array<{ __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null, phone?: string | null, contactName?: string | null, defaultHourlyRateCents?: number | null, currency?: string | null, archivedAt?: Date | null, createdAt?: Date | null, updatedAt?: Date | null }> | null, pageInfo?: { __typename?: 'PageInfo', hasNextPage?: boolean | null, nextOffset?: number | null } | null } | null };

export type GetClientQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  teamId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type GetClientQuery = { __typename?: 'Query', client?: { __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null, phone?: string | null, contactName?: string | null, billingAddress?: any | null, taxId?: string | null, defaultHourlyRateCents?: number | null, currency?: string | null, notes?: string | null, archivedAt?: Date | null, createdAt?: Date | null, updatedAt?: Date | null, projects?: { __typename?: 'ProjectConnection', total?: number | null, nodes?: Array<{ __typename?: 'Project', id?: string | null, name?: string | null, status?: Status | null, code?: string | null, color?: string | null, createdAt?: Date | null }> | null, pageInfo?: { __typename?: 'PageInfo', hasNextPage?: boolean | null } | null } | null, invoices?: { __typename?: 'InvoiceConnection', total?: number | null, nodes?: Array<{ __typename?: 'Invoice', id?: string | null, invoiceNumber?: string | null, status?: InvoiceStatus | null, issuedDate?: Date | null, dueDate?: Date | null, totalCents?: number | null }> | null } | null } | null };

export type SearchClientsQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  q: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchClientsQuery = { __typename?: 'Query', searchClients?: Array<{ __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null }> | null };

export type CreateClientMutationVariables = Exact<{
  input: ClientInput;
}>;


export type CreateClientMutation = { __typename?: 'Mutation', createClient?: { __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null, phone?: string | null, contactName?: string | null, teamId?: string | null, createdAt?: Date | null } | null };

export type UpdateClientMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ClientPatch;
}>;


export type UpdateClientMutation = { __typename?: 'Mutation', updateClient?: { __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null, phone?: string | null, contactName?: string | null, updatedAt?: Date | null } | null };

export type ArchiveClientMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ArchiveClientMutation = { __typename?: 'Mutation', archiveClient?: { __typename?: 'Client', id?: string | null, archivedAt?: Date | null } | null };

export type UnarchiveClientMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnarchiveClientMutation = { __typename?: 'Mutation', unarchiveClient?: { __typename?: 'Client', id?: string | null, archivedAt?: Date | null } | null };

export type DeleteClientMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteClientMutation = { __typename?: 'Mutation', deleteClient?: boolean | null };

export type GetTeamMembersForProjectQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
}>;


export type GetTeamMembersForProjectQuery = { __typename?: 'Query', teamMembers?: Array<{ __typename?: 'TeamMember', id?: string | null, user?: { __typename?: 'User', id?: string | null, name?: string | null, email?: string | null, displayName?: string | null } | null }> | null };

export type ListProjectsQueryVariables = Exact<{
  args: ListArgs;
}>;


export type ListProjectsQuery = { __typename?: 'Query', projects?: { __typename?: 'ProjectConnection', total?: number | null, nodes?: Array<{ __typename?: 'Project', id?: string | null, name?: string | null, code?: string | null, status?: Status | null, color?: string | null, tags?: Array<string> | null, startDate?: Date | null, dueDate?: Date | null, createdAt?: Date | null, client?: { __typename?: 'Client', id?: string | null, name?: string | null } | null }> | null, pageInfo?: { __typename?: 'PageInfo', hasNextPage?: boolean | null, nextOffset?: number | null } | null } | null };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id?: string | null, name?: string | null, description?: string | null, code?: string | null, status?: Status | null, color?: string | null, tags?: Array<string> | null, defaultHourlyRateCents?: number | null, budgetType?: string | null, budgetHours?: number | null, budgetAmountCents?: number | null, startDate?: Date | null, dueDate?: Date | null, archivedAt?: Date | null, createdAt?: Date | null, updatedAt?: Date | null, client?: { __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null } | null, tasks?: { __typename?: 'TaskConnection', total?: number | null, nodes?: Array<{ __typename?: 'Task', id?: string | null, name?: string | null, description?: string | null, status?: Status | null, billable?: boolean | null, hourlyRateCents?: number | null, tags?: Array<string> | null, orderIndex?: number | null, assignees?: Array<{ __typename?: 'TaskAssignee', id?: string | null, user?: { __typename?: 'User', id?: string | null, name?: string | null, email?: string | null } | null }> | null }> | null } | null, members?: Array<{ __typename?: 'ProjectMember', id?: string | null, role?: ProjectRole | null, user?: { __typename?: 'User', id?: string | null, name?: string | null, email?: string | null, displayName?: string | null } | null }> | null } | null };

export type CreateProjectMutationVariables = Exact<{
  input: ProjectInput;
}>;


export type CreateProjectMutation = { __typename?: 'Mutation', createProject?: { __typename?: 'Project', id?: string | null, name?: string | null, code?: string | null, status?: Status | null, createdAt?: Date | null } | null };

export type UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ProjectPatch;
}>;


export type UpdateProjectMutation = { __typename?: 'Mutation', updateProject?: { __typename?: 'Project', id?: string | null, name?: string | null, description?: string | null, status?: Status | null, updatedAt?: Date | null } | null };

export type SetProjectStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type SetProjectStatusMutation = { __typename?: 'Mutation', setProjectStatus?: { __typename?: 'Project', id?: string | null, status?: Status | null, updatedAt?: Date | null } | null };

export type AddProjectMemberMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
}>;


export type AddProjectMemberMutation = { __typename?: 'Mutation', addProjectMember?: { __typename?: 'ProjectMember', id?: string | null, role?: ProjectRole | null, user?: { __typename?: 'User', id?: string | null, name?: string | null, email?: string | null, displayName?: string | null } | null } | null };

export type RemoveProjectMemberMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveProjectMemberMutation = { __typename?: 'Mutation', removeProjectMember?: boolean | null };

export type GetTaskQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTaskQuery = { __typename?: 'Query', task?: { __typename?: 'Task', id?: string | null, name?: string | null, description?: string | null, status?: Status | null, billable?: boolean | null, hourlyRateCents?: number | null, tags?: Array<string> | null, orderIndex?: number | null, createdAt?: Date | null, updatedAt?: Date | null, project?: { __typename?: 'Project', id?: string | null, name?: string | null, color?: string | null } | null, assignees?: Array<{ __typename?: 'TaskAssignee', id?: string | null, user?: { __typename?: 'User', id?: string | null, name?: string | null, email?: string | null, displayName?: string | null } | null }> | null } | null };

export type ListTasksQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListTasksQuery = { __typename?: 'Query', tasks?: { __typename?: 'TaskConnection', total?: number | null, nodes?: Array<{ __typename?: 'Task', id?: string | null, name?: string | null, description?: string | null, status?: Status | null, billable?: boolean | null, hourlyRateCents?: number | null, tags?: Array<string> | null, orderIndex?: number | null, createdAt?: Date | null, assignees?: Array<{ __typename?: 'TaskAssignee', id?: string | null, user?: { __typename?: 'User', id?: string | null, name?: string | null, email?: string | null } | null }> | null }> | null, pageInfo?: { __typename?: 'PageInfo', hasNextPage?: boolean | null, nextOffset?: number | null } | null } | null };

export type CreateTaskMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  input: TaskInput;
}>;


export type CreateTaskMutation = { __typename?: 'Mutation', createTask?: { __typename?: 'Task', id?: string | null, name?: string | null, description?: string | null, status?: Status | null, billable?: boolean | null, orderIndex?: number | null, createdAt?: Date | null } | null };

export type UpdateTaskMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: TaskPatch;
}>;


export type UpdateTaskMutation = { __typename?: 'Mutation', updateTask?: { __typename?: 'Task', id?: string | null, name?: string | null, description?: string | null, status?: Status | null, billable?: boolean | null, updatedAt?: Date | null } | null };

export type ReorderTasksMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  order: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ReorderTasksMutation = { __typename?: 'Mutation', reorderTasks?: boolean | null };

export type AddTaskAssigneeMutationVariables = Exact<{
  taskId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;


export type AddTaskAssigneeMutation = { __typename?: 'Mutation', addTaskAssignee?: { __typename?: 'TaskAssignee', id?: string | null, user?: { __typename?: 'User', id?: string | null, name?: string | null } | null } | null };

export type RemoveTaskAssigneeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveTaskAssigneeMutation = { __typename?: 'Mutation', removeTaskAssignee?: boolean | null };

export type ListTimeEntriesQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  projectId?: InputMaybe<Scalars['ID']['input']>;
  taskId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
  billable?: InputMaybe<Scalars['Boolean']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListTimeEntriesQuery = { __typename?: 'Query', timeEntries?: { __typename?: 'TimeEntryConnection', total?: number | null, nodes?: Array<{ __typename?: 'TimeEntry', id?: string | null, note?: string | null, startedAt?: Date | null, stoppedAt?: Date | null, durationSeconds?: number | null, billable?: boolean | null, hourlyRateCents?: number | null, amountCents?: number | null, project?: { __typename?: 'Project', id?: string | null, name?: string | null, code?: string | null } | null, task?: { __typename?: 'Task', id?: string | null, name?: string | null } | null, user?: { __typename?: 'User', id?: string | null, name?: string | null } | null }> | null, pageInfo?: { __typename?: 'PageInfo', hasNextPage?: boolean | null, nextOffset?: number | null } | null } | null };

export type StartTimerMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  taskId?: InputMaybe<Scalars['ID']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  billable?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type StartTimerMutation = { __typename?: 'Mutation', startTimer?: { __typename?: 'TimeEntry', id?: string | null, startedAt?: Date | null, note?: string | null, billable?: boolean | null } | null };

export type StopTimerMutationVariables = Exact<{
  timeEntryId: Scalars['ID']['input'];
}>;


export type StopTimerMutation = { __typename?: 'Mutation', stopTimer?: { __typename?: 'TimeEntry', id?: string | null, stoppedAt?: Date | null, durationSeconds?: number | null, amountCents?: number | null } | null };

export type ListInvoicesQueryVariables = Exact<{
  teamId: Scalars['ID']['input'];
  clientId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListInvoicesQuery = { __typename?: 'Query', invoices?: { __typename?: 'InvoiceConnection', total?: number | null, nodes?: Array<{ __typename?: 'Invoice', id?: string | null, invoiceNumber?: string | null, status?: InvoiceStatus | null, issuedDate?: Date | null, dueDate?: Date | null, subtotalCents?: number | null, taxAmountCents?: number | null, totalCents?: number | null, createdAt?: Date | null, client?: { __typename?: 'Client', id?: string | null, name?: string | null } | null }> | null, pageInfo?: { __typename?: 'PageInfo', hasNextPage?: boolean | null, nextOffset?: number | null } | null } | null };

export type GetInvoiceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetInvoiceQuery = { __typename?: 'Query', invoice?: { __typename?: 'Invoice', id?: string | null, invoiceNumber?: string | null, status?: InvoiceStatus | null, issuedDate?: Date | null, dueDate?: Date | null, subtotalCents?: number | null, taxRatePercent?: number | null, taxAmountCents?: number | null, totalCents?: number | null, notes?: string | null, createdAt?: Date | null, updatedAt?: Date | null, client?: { __typename?: 'Client', id?: string | null, name?: string | null, email?: string | null, contactName?: string | null, billingAddress?: any | null, taxId?: string | null } | null, items?: Array<{ __typename?: 'InvoiceItem', id?: string | null, description?: string | null, quantity?: number | null, rateCents?: number | null, amountCents?: number | null, timeEntryId?: string | null, createdAt?: Date | null }> | null } | null };

export type CreateInvoiceMutationVariables = Exact<{
  input: InvoiceInput;
}>;


export type CreateInvoiceMutation = { __typename?: 'Mutation', createInvoice?: { __typename?: 'Invoice', id?: string | null, invoiceNumber?: string | null, status?: InvoiceStatus | null, issuedDate?: Date | null, dueDate?: Date | null, createdAt?: Date | null } | null };

export type UpdateInvoiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: InvoicePatch;
}>;


export type UpdateInvoiceMutation = { __typename?: 'Mutation', updateInvoice?: { __typename?: 'Invoice', id?: string | null, invoiceNumber?: string | null, status?: InvoiceStatus | null, updatedAt?: Date | null } | null };

export type MarkInvoicePaidMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkInvoicePaidMutation = { __typename?: 'Mutation', markInvoicePaid?: { __typename?: 'Invoice', id?: string | null, status?: InvoiceStatus | null, updatedAt?: Date | null } | null };

export type CancelInvoiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelInvoiceMutation = { __typename?: 'Mutation', cancelInvoice?: { __typename?: 'Invoice', id?: string | null, status?: InvoiceStatus | null, updatedAt?: Date | null } | null };

export type AddInvoiceItemMutationVariables = Exact<{
  invoiceId: Scalars['ID']['input'];
  input: InvoiceItemInput;
}>;


export type AddInvoiceItemMutation = { __typename?: 'Mutation', addInvoiceItem?: { __typename?: 'InvoiceItem', id?: string | null, description?: string | null, quantity?: number | null, rateCents?: number | null, amountCents?: number | null } | null };

export type UpdateInvoiceItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: InvoiceItemPatch;
}>;


export type UpdateInvoiceItemMutation = { __typename?: 'Mutation', updateInvoiceItem?: { __typename?: 'InvoiceItem', id?: string | null, description?: string | null, quantity?: number | null, rateCents?: number | null, amountCents?: number | null } | null };

export type RemoveInvoiceItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveInvoiceItemMutation = { __typename?: 'Mutation', removeInvoiceItem?: boolean | null };



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Client: ResolverTypeWrapper<Client>;
  ClientConnection: ResolverTypeWrapper<Omit<ClientConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversTypes['Client']>>, pageInfo?: Maybe<ResolversTypes['PageInfo']> }>;
  ClientInput: ClientInput;
  ClientPatch: ClientPatch;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InstanceRole: InstanceRole;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Invoice: ResolverTypeWrapper<Invoice>;
  InvoiceConnection: ResolverTypeWrapper<Omit<InvoiceConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversTypes['Invoice']>>, pageInfo?: Maybe<ResolversTypes['PageInfo']> }>;
  InvoiceInput: InvoiceInput;
  InvoiceItem: ResolverTypeWrapper<InvoiceItem>;
  InvoiceItemInput: InvoiceItemInput;
  InvoiceItemPatch: InvoiceItemPatch;
  InvoicePatch: InvoicePatch;
  InvoiceStatus: InvoiceStatus;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  ListArgs: ListArgs;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Order: Order;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Project: ResolverTypeWrapper<Project>;
  ProjectConnection: ResolverTypeWrapper<Omit<ProjectConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversTypes['Project']>>, pageInfo?: Maybe<ResolversTypes['PageInfo']> }>;
  ProjectInput: ProjectInput;
  ProjectMember: ResolverTypeWrapper<ProjectMember>;
  ProjectPatch: ProjectPatch;
  ProjectRole: ProjectRole;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Status: Status;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Task: ResolverTypeWrapper<ProjectTask>;
  TaskAssignee: ResolverTypeWrapper<TaskAssignee>;
  TaskConnection: ResolverTypeWrapper<Omit<TaskConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversTypes['Task']>>, pageInfo?: Maybe<ResolversTypes['PageInfo']> }>;
  TaskInput: TaskInput;
  TaskPatch: TaskPatch;
  Team: ResolverTypeWrapper<Team>;
  TeamMember: ResolverTypeWrapper<Omit<TeamMember, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  TeamRole: TeamRole;
  TimeEntry: ResolverTypeWrapper<TimeEntry>;
  TimeEntryConnection: ResolverTypeWrapper<Omit<TimeEntryConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversTypes['TimeEntry']>>, pageInfo?: Maybe<ResolversTypes['PageInfo']> }>;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  Client: Client;
  ClientConnection: Omit<ClientConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversParentTypes['Client']>>, pageInfo?: Maybe<ResolversParentTypes['PageInfo']> };
  ClientInput: ClientInput;
  ClientPatch: ClientPatch;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Invoice: Invoice;
  InvoiceConnection: Omit<InvoiceConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversParentTypes['Invoice']>>, pageInfo?: Maybe<ResolversParentTypes['PageInfo']> };
  InvoiceInput: InvoiceInput;
  InvoiceItem: InvoiceItem;
  InvoiceItemInput: InvoiceItemInput;
  InvoiceItemPatch: InvoiceItemPatch;
  InvoicePatch: InvoicePatch;
  JSON: Scalars['JSON']['output'];
  ListArgs: ListArgs;
  Mutation: Record<PropertyKey, never>;
  PageInfo: PageInfo;
  Project: Project;
  ProjectConnection: Omit<ProjectConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversParentTypes['Project']>>, pageInfo?: Maybe<ResolversParentTypes['PageInfo']> };
  ProjectInput: ProjectInput;
  ProjectMember: ProjectMember;
  ProjectPatch: ProjectPatch;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  Task: ProjectTask;
  TaskAssignee: TaskAssignee;
  TaskConnection: Omit<TaskConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversParentTypes['Task']>>, pageInfo?: Maybe<ResolversParentTypes['PageInfo']> };
  TaskInput: TaskInput;
  TaskPatch: TaskPatch;
  Team: Team;
  TeamMember: Omit<TeamMember, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
  TimeEntry: TimeEntry;
  TimeEntryConnection: Omit<TimeEntryConnection, 'nodes' | 'pageInfo'> & { nodes?: Maybe<Array<ResolversParentTypes['TimeEntry']>>, pageInfo?: Maybe<ResolversParentTypes['PageInfo']> };
  User: User;
};

export type ClientResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Client'] = ResolversParentTypes['Client']> = {
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  billingAddress?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  contactName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  currency?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  defaultHourlyRateCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  invoices?: Resolver<Maybe<ResolversTypes['InvoiceConnection']>, ParentType, ContextType, RequireFields<ClientInvoicesArgs, 'limit' | 'offset' | 'order'>>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  projects?: Resolver<Maybe<ResolversTypes['ProjectConnection']>, ParentType, ContextType, RequireFields<ClientProjectsArgs, 'limit' | 'offset' | 'order'>>;
  taxId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  teamId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type ClientConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ClientConnection'] = ResolversParentTypes['ClientConnection']> = {
  nodes?: Resolver<Maybe<Array<ResolversTypes['Client']>>, ParentType, ContextType>;
  pageInfo?: Resolver<Maybe<ResolversTypes['PageInfo']>, ParentType, ContextType>;
  total?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type InvoiceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Invoice'] = ResolversParentTypes['Invoice']> = {
  client?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType>;
  clientId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  invoiceNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  issuedDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  items?: Resolver<Maybe<Array<ResolversTypes['InvoiceItem']>>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['InvoiceStatus']>, ParentType, ContextType>;
  subtotalCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  taxAmountCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  taxRatePercent?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  team?: Resolver<Maybe<ResolversTypes['Team']>, ParentType, ContextType>;
  timeEntries?: Resolver<Maybe<Array<ResolversTypes['TimeEntry']>>, ParentType, ContextType>;
  totalCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type InvoiceConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InvoiceConnection'] = ResolversParentTypes['InvoiceConnection']> = {
  nodes?: Resolver<Maybe<Array<ResolversTypes['Invoice']>>, ParentType, ContextType>;
  pageInfo?: Resolver<Maybe<ResolversTypes['PageInfo']>, ParentType, ContextType>;
  total?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type InvoiceItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InvoiceItem'] = ResolversParentTypes['InvoiceItem']> = {
  amountCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  invoiceId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rateCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  timeEntries?: Resolver<Maybe<Array<ResolversTypes['TimeEntry']>>, ParentType, ContextType>;
  timeEntryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addInvoiceItem?: Resolver<Maybe<ResolversTypes['InvoiceItem']>, ParentType, ContextType, RequireFields<MutationAddInvoiceItemArgs, 'input' | 'invoiceId'>>;
  addProjectMember?: Resolver<Maybe<ResolversTypes['ProjectMember']>, ParentType, ContextType, RequireFields<MutationAddProjectMemberArgs, 'projectId' | 'role' | 'userId'>>;
  addTaskAssignee?: Resolver<Maybe<ResolversTypes['TaskAssignee']>, ParentType, ContextType, RequireFields<MutationAddTaskAssigneeArgs, 'taskId' | 'userId'>>;
  addTimeEntriesToInvoiceItem?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationAddTimeEntriesToInvoiceItemArgs, 'invoiceItemId' | 'timeEntryIds'>>;
  archiveClient?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType, RequireFields<MutationArchiveClientArgs, 'id'>>;
  cancelInvoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<MutationCancelInvoiceArgs, 'id'>>;
  createClient?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType, RequireFields<MutationCreateClientArgs, 'input'>>;
  createInvoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<MutationCreateInvoiceArgs, 'input'>>;
  createProject?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<MutationCreateProjectArgs, 'input'>>;
  createTask?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType, RequireFields<MutationCreateTaskArgs, 'input' | 'projectId'>>;
  createTimeEntry?: Resolver<Maybe<ResolversTypes['TimeEntry']>, ParentType, ContextType, RequireFields<MutationCreateTimeEntryArgs, 'billable' | 'projectId' | 'startedAt' | 'stoppedAt'>>;
  deleteClient?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteClientArgs, 'id'>>;
  deleteInvoice?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteInvoiceArgs, 'id'>>;
  deleteTask?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteTaskArgs, 'id'>>;
  deleteTimeEntry?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteTimeEntryArgs, 'timeEntryId'>>;
  markInvoicePaid?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<MutationMarkInvoicePaidArgs, 'id'>>;
  markInvoiceSent?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<MutationMarkInvoiceSentArgs, 'id'>>;
  removeInvoiceItem?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRemoveInvoiceItemArgs, 'id'>>;
  removeProjectMember?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRemoveProjectMemberArgs, 'id'>>;
  removeTaskAssignee?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRemoveTaskAssigneeArgs, 'id'>>;
  removeTimeEntryFromInvoice?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationRemoveTimeEntryFromInvoiceArgs, 'invoiceId' | 'timeEntryId'>>;
  reorderTasks?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationReorderTasksArgs, 'order' | 'projectId'>>;
  setProjectStatus?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<MutationSetProjectStatusArgs, 'id' | 'status'>>;
  startTimer?: Resolver<Maybe<ResolversTypes['TimeEntry']>, ParentType, ContextType, RequireFields<MutationStartTimerArgs, 'billable' | 'projectId'>>;
  stopTimer?: Resolver<Maybe<ResolversTypes['TimeEntry']>, ParentType, ContextType, RequireFields<MutationStopTimerArgs, 'timeEntryId'>>;
  unarchiveClient?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType, RequireFields<MutationUnarchiveClientArgs, 'id'>>;
  updateClient?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType, RequireFields<MutationUpdateClientArgs, 'id' | 'input'>>;
  updateInvoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<MutationUpdateInvoiceArgs, 'id' | 'input'>>;
  updateInvoiceItem?: Resolver<Maybe<ResolversTypes['InvoiceItem']>, ParentType, ContextType, RequireFields<MutationUpdateInvoiceItemArgs, 'id' | 'input'>>;
  updateProject?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>>;
  updateProjectMember?: Resolver<Maybe<ResolversTypes['ProjectMember']>, ParentType, ContextType, RequireFields<MutationUpdateProjectMemberArgs, 'id' | 'role'>>;
  updateTask?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType, RequireFields<MutationUpdateTaskArgs, 'id' | 'input'>>;
  updateTimeEntry?: Resolver<Maybe<ResolversTypes['TimeEntry']>, ParentType, ContextType, RequireFields<MutationUpdateTimeEntryArgs, 'timeEntryId'>>;
  updateUserPassword?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationUpdateUserPasswordArgs, 'currentPassword' | 'newPassword'>>;
  updateUserProfile?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, Partial<MutationUpdateUserProfileArgs>>;
};

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  hasNextPage?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  nextOffset?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ProjectResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = {
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  budgetAmountCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  budgetHours?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  budgetType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  client?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType>;
  clientId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  color?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  defaultHourlyRateCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  members?: Resolver<Maybe<Array<ResolversTypes['ProjectMember']>>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  startDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['Status']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  tasks?: Resolver<Maybe<ResolversTypes['TaskConnection']>, ParentType, ContextType, RequireFields<ProjectTasksArgs, 'limit' | 'offset' | 'order'>>;
  teamId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type ProjectConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProjectConnection'] = ResolversParentTypes['ProjectConnection']> = {
  nodes?: Resolver<Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  pageInfo?: Resolver<Maybe<ResolversTypes['PageInfo']>, ParentType, ContextType>;
  total?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ProjectMemberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProjectMember'] = ResolversParentTypes['ProjectMember']> = {
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['ProjectRole']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  client?: Resolver<Maybe<ResolversTypes['Client']>, ParentType, ContextType, RequireFields<QueryClientArgs, 'id'>>;
  clients?: Resolver<Maybe<ResolversTypes['ClientConnection']>, ParentType, ContextType, RequireFields<QueryClientsArgs, 'args'>>;
  invoice?: Resolver<Maybe<ResolversTypes['Invoice']>, ParentType, ContextType, RequireFields<QueryInvoiceArgs, 'id'>>;
  invoices?: Resolver<Maybe<ResolversTypes['InvoiceConnection']>, ParentType, ContextType, RequireFields<QueryInvoicesArgs, 'limit' | 'offset' | 'order' | 'teamId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<QueryProjectArgs, 'id'>>;
  projects?: Resolver<Maybe<ResolversTypes['ProjectConnection']>, ParentType, ContextType, RequireFields<QueryProjectsArgs, 'args'>>;
  searchClients?: Resolver<Maybe<Array<ResolversTypes['Client']>>, ParentType, ContextType, RequireFields<QuerySearchClientsArgs, 'limit' | 'q' | 'teamId'>>;
  task?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType, RequireFields<QueryTaskArgs, 'id'>>;
  tasks?: Resolver<Maybe<ResolversTypes['TaskConnection']>, ParentType, ContextType, RequireFields<QueryTasksArgs, 'limit' | 'offset' | 'order' | 'projectId'>>;
  teamMembers?: Resolver<Maybe<Array<ResolversTypes['TeamMember']>>, ParentType, ContextType, RequireFields<QueryTeamMembersArgs, 'teamId'>>;
  timeEntries?: Resolver<Maybe<ResolversTypes['TimeEntryConnection']>, ParentType, ContextType, RequireFields<QueryTimeEntriesArgs, 'limit' | 'offset' | 'order' | 'teamId'>>;
};

export type TaskResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Task'] = ResolversParentTypes['Task']> = {
  assignees?: Resolver<Maybe<Array<ResolversTypes['TaskAssignee']>>, ParentType, ContextType>;
  billable?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hourlyRateCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  orderIndex?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['Status']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type TaskAssigneeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TaskAssignee'] = ResolversParentTypes['TaskAssignee']> = {
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  taskId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export type TaskConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TaskConnection'] = ResolversParentTypes['TaskConnection']> = {
  nodes?: Resolver<Maybe<Array<ResolversTypes['Task']>>, ParentType, ContextType>;
  pageInfo?: Resolver<Maybe<ResolversTypes['PageInfo']>, ParentType, ContextType>;
  total?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type TeamResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Team'] = ResolversParentTypes['Team']> = {
  billingAddress?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type TeamMemberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TeamMember'] = ResolversParentTypes['TeamMember']> = {
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  teamId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export type TimeEntryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TimeEntry'] = ResolversParentTypes['TimeEntry']> = {
  amountCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  billable?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  clientId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  durationSeconds?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  hourlyRateCents?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  stoppedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  task?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType>;
  taskId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
};

export type TimeEntryConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TimeEntryConnection'] = ResolversParentTypes['TimeEntryConnection']> = {
  nodes?: Resolver<Maybe<Array<ResolversTypes['TimeEntry']>>, ParentType, ContextType>;
  pageInfo?: Resolver<Maybe<ResolversTypes['PageInfo']>, ParentType, ContextType>;
  total?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  instanceRole?: Resolver<Maybe<ResolversTypes['InstanceRole']>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Client?: ClientResolvers<ContextType>;
  ClientConnection?: ClientConnectionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Invoice?: InvoiceResolvers<ContextType>;
  InvoiceConnection?: InvoiceConnectionResolvers<ContextType>;
  InvoiceItem?: InvoiceItemResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectConnection?: ProjectConnectionResolvers<ContextType>;
  ProjectMember?: ProjectMemberResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  TaskAssignee?: TaskAssigneeResolvers<ContextType>;
  TaskConnection?: TaskConnectionResolvers<ContextType>;
  Team?: TeamResolvers<ContextType>;
  TeamMember?: TeamMemberResolvers<ContextType>;
  TimeEntry?: TimeEntryResolvers<ContextType>;
  TimeEntryConnection?: TimeEntryConnectionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

