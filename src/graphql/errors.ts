import { GraphQLError } from 'graphql';

export class ConflictError extends GraphQLError {
  constructor(message: string, detail?: string) {
    super(message, {
      extensions: {
        code: 'CONFLICT',
        detail,
      },
    });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'NOT_FOUND',
      },
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'FORBIDDEN',
      },
    });
  }
}

export class UnauthorizedError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'UNAUTHORIZED',
      },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string, field?: string) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        field,
      },
    });
  }
}

export class DependencyError extends GraphQLError {
  constructor(message: string, detail?: string) {
    super(message, {
      extensions: {
        code: 'DEPENDENCY_VIOLATION',
        detail,
      },
    });
  }
}

/**
 * Maps PostgreSQL error codes to GraphQL errors
 */
export function mapPgError(error: any): never {
  // PostgreSQL error codes
  const pgError = error as { code?: string; constraint?: string; detail?: string; message?: string };

  switch (pgError.code) {
    case '23505': // unique_violation
      throw new ConflictError(
        'A record with this value already exists',
        pgError.detail || pgError.constraint
      );

    case '23503': // foreign_key_violation
      throw new DependencyError(
        'Cannot perform operation due to dependent records',
        pgError.detail
      );

    case '23502': // not_null_violation
      throw new ValidationError(
        'Required field is missing',
        pgError.constraint
      );

    case '23514': // check_violation
      throw new ValidationError(
        'Value does not meet constraint requirements',
        pgError.constraint
      );

    default:
      // Don't leak internal PostgreSQL errors
      console.error('Unhandled database error:', error);
      throw new GraphQLError('An unexpected database error occurred', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
        },
      });
  }
}

/**
 * Wraps a database operation with error mapping
 */
export async function withErrorMapping<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPgError(error);
  }
}
