/**
 * Role-Based Access Control (RBAC) & Permission System
 * 
 * Designed for:
 * 1. Business Owners (OWNER): Full unrestricted visibility across all companies, margins, ledgers, users.
 * 2. Office / Branch Admins (ADMIN): Manage assigned companies, masters, daily operations, saudas, billing.
 * 3. Employees / Operators (EMPLOYEE): Restricted operational staff (enter saudas/deliveries, basic party lookup; no profit ledgers, no deletions).
 * 4. Auditors (AUDITOR): Read-only visibility into financial ledgers and transactions.
 * 
 * Usage in API routes:
 * ```ts
 * import { can } from "@/lib/permissions";
 * if (!can(currentUser, 'contracts', 'delete')) {
 *   return Response.json({ error: "Forbidden" }, { status: 403 });
 * }
 * ```
 */

export type AppRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'AUDITOR';

export type AppResource = 
  | 'contracts'
  | 'deliveries'
  | 'parties'
  | 'commodities'
  | 'billing'
  | 'payments'
  | 'ledger'
  | 'users'
  | 'companies'
  | 'masters'
  | 'reports'
  | 'marketplace';

export type AppAction = 'read' | 'create' | 'edit' | 'delete' | 'export' | 'manage';

export type PermissionMatrix = {
  [key in AppResource]?: {
    [key in AppAction]?: boolean;
  };
};

export interface UserContext {
  id: number;
  username: string;
  role: AppRole | string;
  companyIds?: number[];
  permissions?: PermissionMatrix | Record<string, any> | null;
}

/**
 * Built-in default permissions per role.
 */
export const ROLE_PERMISSIONS: Record<AppRole, PermissionMatrix> = {
  OWNER: {
    contracts:   { read: true, create: true, edit: true, delete: true, export: true, manage: true },
    deliveries:  { read: true, create: true, edit: true, delete: true, export: true, manage: true },
    parties:     { read: true, create: true, edit: true, delete: true, export: true, manage: true },
    commodities: { read: true, create: true, edit: true, delete: true, export: true, manage: true },
    billing:     { read: true, create: true, edit: true, delete: true, export: true, manage: true },
    payments:    { read: true, create: true, edit: true, delete: true, export: true, manage: true },
    ledger:      { read: true, export: true, manage: true },
    users:       { read: true, create: true, edit: true, delete: true, manage: true },
    companies:   { read: true, create: true, edit: true, delete: true, manage: true },
    masters:     { read: true, create: true, edit: true, delete: true, manage: true },
    reports:     { read: true, export: true, manage: true },
    marketplace: { read: true, manage: true },
  },
  ADMIN: {
    contracts:   { read: true, create: true, edit: true, delete: true, export: true },
    deliveries:  { read: true, create: true, edit: true, delete: true, export: true },
    parties:     { read: true, create: true, edit: true, delete: false, export: true },
    commodities: { read: true, create: true, edit: true, delete: false, export: true },
    billing:     { read: true, create: true, edit: true, delete: false, export: true },
    payments:    { read: true, create: true, edit: true, delete: false, export: true },
    ledger:      { read: true, export: true },
    users:       { read: true, create: true, edit: true, delete: false },
    companies:   { read: true, create: false, edit: false, delete: false },
    masters:     { read: true, create: true, edit: true, delete: false },
    reports:     { read: true, export: true },
    marketplace: { read: true },
  },
  EMPLOYEE: {
    contracts:   { read: true, create: true, edit: true, delete: false, export: false },
    deliveries:  { read: true, create: true, edit: true, delete: false, export: false },
    parties:     { read: true, create: true, edit: false, delete: false, export: false },
    commodities: { read: true, create: false, edit: false, delete: false, export: false },
    billing:     { read: false, create: false, edit: false, delete: false, export: false },
    payments:    { read: false, create: false, edit: false, delete: false, export: false },
    ledger:      { read: false, export: false },
    users:       { read: false },
    companies:   { read: true },
    masters:     { read: true, create: false, edit: false, delete: false },
    reports:     { read: false },
    marketplace: { read: false },
  },
  AUDITOR: {
    contracts:   { read: true, export: true },
    deliveries:  { read: true, export: true },
    parties:     { read: true, export: true },
    commodities: { read: true },
    billing:     { read: true, export: true },
    payments:    { read: true, export: true },
    ledger:      { read: true, export: true },
    users:       { read: false },
    companies:   { read: true },
    masters:     { read: true },
    reports:     { read: true, export: true },
    marketplace: { read: false },
  },
};

/**
 * Checks if a user has permission to perform an action on a resource.
 * - OWNER always has full access.
 * - Custom user-level permission overrides take precedence over role defaults.
 */
export function can(
  user: UserContext | null | undefined,
  resource: AppResource,
  action: AppAction
): boolean {
  if (!user) return false;

  const role = (user.role?.toUpperCase() || 'EMPLOYEE') as AppRole;

  // Business Owner has absolute access
  if (role === 'OWNER') return true;

  // 1. Check custom user-level overrides stored in users.permissions JSONB
  if (user.permissions && typeof user.permissions === 'object') {
    const resourcePerms = (user.permissions as Record<string, any>)[resource];
    if (resourcePerms && typeof resourcePerms[action] === 'boolean') {
      return resourcePerms[action];
    }
  }

  // 2. Fall back to role default permissions
  const roleDefaults = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.EMPLOYEE;
  const resourcePerms = roleDefaults[resource];
  if (!resourcePerms) return false;

  return !!resourcePerms[action];
}

/**
 * Checks if a user has access to a specific company.
 * - OWNER has access to all companies.
 * - Other users must have companyId in their assigned companyIds list.
 */
export function hasCompanyAccess(user: UserContext | null | undefined, companyId: number): boolean {
  if (!user) return false;
  const role = (user.role?.toUpperCase() || 'EMPLOYEE') as AppRole;
  if (role === 'OWNER') return true;

  if (!user.companyIds || user.companyIds.length === 0) {
    return true; // Default permissive if access table not populated yet
  }

  return user.companyIds.includes(companyId);
}
