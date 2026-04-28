import type { ReactNode } from "react";
import { usePermission } from "../hooks";
import type { PermissionSpec } from "../core/types";

export interface CanProps extends PermissionSpec {
  children: ReactNode;
  /**
   * Content to render when the check fails.
   * 
   * @example
   * <Can permissions="admin:panel" fallback={<UpgradePrompt />}>
   *   <AdminPanel />
   * </Can>
   */
  fallback?: ReactNode;
}

/**
 * `<Can>` — declarative permission gate for React trees.
 * @example
 * // Role check
 * <Can roles="admin"><DeleteButton /></Can>
 *
 * // Permission check with fallback
 * <Can permissions={["write:own","publish:post"]} fallback={<ReadOnly />}>
 *   <Editor />
 * </Can>
 *
 * // Custom rule + inline predicate
 * <Can rules="isVerified" check={u => u.age >= 18}>
 *   <MatureContent />
 * </Can>
 *
 * // OR logic across top-level conditions
 * <Can roles="admin" rules="isPremium" require="any">
 *   <PremiumFeature />
 * </Can>
 */
export function Can({
  children,
  fallback = null,
  roles,
  permissions,
  anyPermission,
  rules,
  check,
  require,
}: CanProps) {
  const can = usePermission();
  const spec: PermissionSpec = { roles, permissions, anyPermission, rules, check, require };
  (Object.keys(spec) as (keyof PermissionSpec)[]).forEach(
    k => spec[k] === undefined && delete spec[k],
  );
  return can(spec) ? children : fallback;
}
