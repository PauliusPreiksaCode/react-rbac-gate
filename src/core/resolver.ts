import type { RolesConfig, HierarchyConfig } from "./types";

/**
 * Resolve all permissions for a single role, walking the hierarchy graph.
 */
function resolveRolePermissions(
  role: string,
  roles: RolesConfig,
  hierarchy: HierarchyConfig,
  cache: Map<string, Set<string>>,
  visiting: Set<string>,
): Set<string> {
  if (cache.has(role)) return cache.get(role)!;
  if (visiting.has(role)) return new Set();

  visiting.add(role);

  const perms = new Set<string>(roles[role] ?? []);

  for (const parent of hierarchy[role] ?? []) {
    const parentPerms = resolveRolePermissions(
      parent,
      roles,
      hierarchy,
      cache,
      visiting,
    );
    for (const p of parentPerms) perms.add(p);
  }

  visiting.delete(role);

  cache.set(role, perms);
  return perms;
}

/**
 * Build the full permission set for a list of user roles.
 *
 * @param userRoles  - The roles assigned to the current user
 * @param roles      - Full roles config
 * @param hierarchy  - Full hierarchy config
 * @returns          - Flat Set of all effective permission strings
 */
export function buildPermissionSet(
  userRoles: string[],
  roles: RolesConfig,
  hierarchy: HierarchyConfig,
): Set<string> {
  const cache = new Map<string, Set<string>>();
  const result = new Set<string>();

  for (const role of userRoles) {
    const perms = resolveRolePermissions(role, roles, hierarchy, cache, new Set());
    for (const p of perms) result.add(p);
  }

  return result;
}

/**
 * Check whether two string arrays are equal (order-independent).
 */
export function rolesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every(r => setA.has(r));
}
