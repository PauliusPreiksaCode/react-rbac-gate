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
 * Build the complete, flat permission set for a list of user roles by walking
 * the role hierarchy graph and collecting every permission string reachable from
 * each of the user's assigned roles.
 *
 * Results for individual roles are memoised within a single call so each role
 * is resolved at most once, even when referenced from multiple parent roles.
 *
 * @param userRoles - Roles currently assigned to the user (from {@link RBACUser.roles}).
 * @param roles     - Full {@link RolesConfig} mapping role names to their direct permissions.
 * @param hierarchy - Full {@link HierarchyConfig} mapping roles to their parent roles.
 * @returns A `Set<string>` containing every effective permission string for the user.
 *
 * @example
 * const perms = buildPermissionSet(
 *   ["editor"],
 *   { editor: ["write:own"], viewer: ["read:any"] },
 *   { editor: ["viewer"] },          // editor inherits from viewer
 * );
 * // perms → Set { "write:own", "read:any" }
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
