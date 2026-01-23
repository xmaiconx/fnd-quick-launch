import { Kysely, Transaction, sql } from 'kysely';
import { Database } from '../types';

/**
 * Options for tenant context execution
 */
export interface TenantContextOptions {
  /**
   * If true, sets app.is_admin = 'true' to bypass RLS policies
   * Use for super-admin operations and impersonation
   */
  isAdmin?: boolean;
}

/**
 * Executes a callback within a tenant-scoped transaction context.
 *
 * Sets PostgreSQL session variables for Row Level Security (RLS):
 * - app.current_account_id: The tenant's account ID for RLS filtering
 * - app.is_admin (optional): Bypass flag for super-admin operations
 *
 * @param db - Kysely database instance
 * @param accountId - The tenant's account ID (required for RLS)
 * @param callback - Function to execute within the tenant context
 * @param options - Optional configuration (isAdmin for bypass)
 * @returns Promise resolving to the callback's return value
 *
 * @example
 * // Normal tenant operation
 * await withTenantContext(db, accountId, async (trx) => {
 *   await trx.insertInto('audit_logs').values({...}).execute();
 * });
 *
 * @example
 * // Admin bypass for cross-tenant operations
 * await withTenantContext(db, accountId, async (trx) => {
 *   return trx.selectFrom('users').selectAll().execute();
 * }, { isAdmin: true });
 */
export async function withTenantContext<T>(
  db: Kysely<Database>,
  accountId: string,
  callback: (trx: Transaction<Database>) => Promise<T>,
  options?: TenantContextOptions,
): Promise<T> {
  if (!accountId) {
    throw new Error('accountId is required for tenant context');
  }

  return db.transaction().execute(async (trx) => {
    // Set the tenant context using SET LOCAL (scoped to transaction only)
    // Using sql template tag for parameterized execution
    await sql`SET LOCAL app.current_account_id = ${accountId}`.execute(trx);

    // Set admin bypass flag if requested
    if (options?.isAdmin) {
      await sql`SET LOCAL app.is_admin = 'true'`.execute(trx);
    }

    // Execute the callback with the tenant-scoped transaction
    return callback(trx);
  });
}
