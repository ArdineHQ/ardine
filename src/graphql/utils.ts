import { ValidationError } from './errors';

export interface OffsetLimitResult {
  offset: number;
  limit: number;
}

/**
 * Parses and validates offset and limit parameters
 */
export function parseOffsetLimit(
  offset?: number | null,
  limit?: number | null,
  maxLimit: number = 100
): OffsetLimitResult {
  const parsedOffset = Math.max(0, offset ?? 0);
  const parsedLimit = Math.min(Math.max(1, limit ?? 25), maxLimit);

  return {
    offset: parsedOffset,
    limit: parsedLimit,
  };
}

export interface SearchResult {
  sql: string;
  params: any[];
  paramOffset: number;
}

/**
 * Builds a search SQL fragment with ILIKE on multiple columns
 * @param term Search term
 * @param columns Columns to search
 * @param paramOffset Starting parameter index (for numbered parameters)
 * @returns SQL fragment and parameters
 */
export function buildSearch(
  term: string | null | undefined,
  columns: string[],
  paramOffset: number = 1
): SearchResult {
  if (!term || columns.length === 0) {
    return { sql: '', params: [], paramOffset };
  }

  const searchTerm = `%${term}%`;
  const conditions = columns.map((col) => `${col} ILIKE $${paramOffset}`);
  const sql = `(${conditions.join(' OR ')})`;

  return {
    sql,
    params: [searchTerm],
    paramOffset: paramOffset + 1,
  };
}

export interface DateRangeResult {
  sql: string;
  params: any[];
  paramOffset: number;
}

/**
 * Builds date range SQL fragment
 * @param from Start date (inclusive)
 * @param to End date (inclusive)
 * @param field Field name to filter
 * @param paramOffset Starting parameter index
 */
export function parseDateRange(
  from: Date | null | undefined,
  to: Date | null | undefined,
  field: string,
  paramOffset: number = 1
): DateRangeResult {
  const conditions: string[] = [];
  const params: any[] = [];
  let offset = paramOffset;

  if (from) {
    conditions.push(`${field} >= $${offset}`);
    params.push(from);
    offset++;
  }

  if (to) {
    conditions.push(`${field} <= $${offset}`);
    params.push(to);
    offset++;
  }

  return {
    sql: conditions.length > 0 ? conditions.join(' AND ') : '',
    params,
    paramOffset: offset,
  };
}

/**
 * Validates and returns a safe ORDER BY column
 * @param orderBy Requested order by column
 * @param allowedColumns Whitelist of allowed columns
 * @param defaultColumn Default column if orderBy is not provided or invalid
 */
export function sortWhitelist(
  orderBy: string | null | undefined,
  allowedColumns: string[],
  defaultColumn: string
): string {
  if (!orderBy) {
    return defaultColumn;
  }

  if (allowedColumns.includes(orderBy)) {
    return orderBy;
  }

  throw new ValidationError(`Invalid orderBy field: ${orderBy}. Allowed fields: ${allowedColumns.join(', ')}`);
}

/**
 * Validates sort order
 */
export function validateOrder(order: string | null | undefined): 'ASC' | 'DESC' {
  if (!order) {
    return 'DESC';
  }

  const upperOrder = order.toUpperCase();
  if (upperOrder === 'ASC' || upperOrder === 'DESC') {
    return upperOrder as 'ASC' | 'DESC';
  }

  throw new ValidationError(`Invalid order: ${order}. Must be 'asc' or 'desc'`);
}

/**
 * Builds a complete SQL query with filters, search, date range, and pagination
 */
export interface QueryBuilderOptions {
  baseSelect: string;
  baseFrom: string;
  filters?: { sql: string; params: any[] }[];
  search?: { term: string; columns: string[] };
  dateRange?: { from?: Date | null; to?: Date | null; field: string };
  orderBy?: string | null;
  order?: 'asc' | 'desc' | null;
  allowedOrderBy: string[];
  defaultOrderBy: string;
  offset: number;
  limit: number;
}

export interface QueryBuilderResult {
  query: string;
  countQuery: string;
  params: any[];
}

export function buildQuery(options: QueryBuilderOptions): QueryBuilderResult {
  const whereClauses: string[] = [];
  const params: any[] = [];
  let paramOffset = 1;

  // Add filters
  if (options.filters) {
    for (const filter of options.filters) {
      if (filter.sql) {
        whereClauses.push(filter.sql);
        params.push(...filter.params);
        paramOffset += filter.params.length;
      }
    }
  }

  // Add search
  if (options.search && options.search.term) {
    const searchResult = buildSearch(options.search.term, options.search.columns, paramOffset);
    if (searchResult.sql) {
      whereClauses.push(searchResult.sql);
      params.push(...searchResult.params);
      paramOffset = searchResult.paramOffset;
    }
  }

  // Add date range
  if (options.dateRange) {
    const dateResult = parseDateRange(
      options.dateRange.from,
      options.dateRange.to,
      options.dateRange.field,
      paramOffset
    );
    if (dateResult.sql) {
      whereClauses.push(dateResult.sql);
      params.push(...dateResult.params);
      paramOffset = dateResult.paramOffset;
    }
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Build ORDER BY
  const orderByColumn = sortWhitelist(options.orderBy, options.allowedOrderBy, options.defaultOrderBy);
  const orderDirection = validateOrder(options.order);
  const orderByClause = `ORDER BY ${orderByColumn} ${orderDirection}`;

  // Build main query
  const query = `
    ${options.baseSelect}
    ${options.baseFrom}
    ${whereClause}
    ${orderByClause}
    LIMIT $${paramOffset} OFFSET $${paramOffset + 1}
  `.trim();

  // Build count query
  const countQuery = `
    SELECT COUNT(*) as total
    ${options.baseFrom}
    ${whereClause}
  `.trim();

  // Add pagination params
  params.push(options.limit, options.offset);

  return { query, countQuery, params };
}

/**
 * Calculates pagination info
 */
export function calculatePageInfo(offset: number, limit: number, total: number) {
  const nextOffset = offset + limit;
  const hasNextPage = nextOffset < total;

  return {
    hasNextPage,
    nextOffset: hasNextPage ? nextOffset : null,
  };
}
