import { Injectable } from '@nestjs/common';

/**
 * RLS Status information returned by getStatus()
 */
export interface RlsStatus {
  enabled: boolean;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * RLS Manager Service
 *
 * Manages the global Row Level Security toggle for emergency situations.
 * State is stored in-memory only (no database table needed).
 *
 * When RLS is disabled:
 * - TenantContextInterceptor skips wrapping handlers with tenant context
 * - All queries return data without tenant filtering
 * - Use only for debugging/emergency situations
 *
 * When RLS is enabled (default):
 * - TenantContextInterceptor wraps authenticated requests with tenant context
 * - RLS policies filter by app.current_account_id
 * - Tenant isolation is enforced at the database level
 *
 * @remarks
 * This is an in-memory toggle. In a multi-instance deployment, each instance
 * maintains its own state. For consistent behavior across instances, consider
 * using Redis or database-backed state in production.
 */
@Injectable()
export class RlsManager {
  private enabled: boolean = true;
  private updatedAt: Date = new Date();
  private updatedBy: string = 'system';

  /**
   * Check if RLS is currently enabled
   * @returns true if RLS policies should be enforced
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable RLS globally
   * @param enabled - true to enable RLS, false to disable
   * @param updatedBy - Email or identifier of the admin making the change
   */
  setEnabled(enabled: boolean, updatedBy: string): void {
    this.enabled = enabled;
    this.updatedAt = new Date();
    this.updatedBy = updatedBy;
  }

  /**
   * Get the current RLS status including when it was last updated
   * @returns RLS status information
   */
  getStatus(): RlsStatus {
    return {
      enabled: this.enabled,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }
}
