import { builder } from './builder';

// Import all type definitions
import './types';
import './inputs';

// Import all resolvers (they register themselves with the builder)
import '../resolvers/users';
import '../resolvers/teams';
import '../resolvers/clients';
import '../resolvers/projects';
import '../resolvers/tasks';
import '../resolvers/timeEntries';
import '../resolvers/invoices';

// Build and export the schema
export const schema = builder.toSchema();
