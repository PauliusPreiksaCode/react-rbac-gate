import type { ReactNode } from "react";
import { usePermission } from "../hooks";
import type { PermissionSpec } from "../core/types";

/**
 * Props for the {@link Can} component.
 *
 * All fields from {@link PermissionSpec} are supported as props. In addition,
 * `children` (required) is the content to show when access is granted, and
 * `fallback` (optional) is the content to show when access is denied.
 */
export interface CanProps extends PermissionSpec {
  /** Content rendered when the permission check passes. */
  children: ReactNode;

  /**
   * Content rendered when the permission check fails.
   * Defaults to `null` (renders nothing on denial).
   *
   * @example
   * <Can permissions="admin:panel" fallback={<UpgradePrompt />}>
   *   <AdminPanel />
   * </Can>
   */
  fallback?: ReactNode;
}

/**
 * Declarative permission gate that conditionally renders its `children`.
 *
 * Accepts all fields from {@link PermissionSpec} as props and evaluates them
 * against the current user via {@link usePermission}. When the check passes,
 * `children` is rendered; when it fails, `fallback` is rendered (default `null`).
 *
 * Prefer `<Can>` over imperative `can()` calls whenever you are gating JSX.
 *
 * @example
 * // Role check — render only for admins
 * <Can roles="admin">
 *   <DeleteButton />
 * </Can>
 *
 * @example
 * // All-permissions check with a fallback UI
 * <Can permissions={["write:own", "publish:post"]} fallback={<ReadOnlyView />}>
 *   <Editor />
 * </Can>
 *
 * @example
 * // Named custom rule combined with an inline predicate
 * <Can rules="isVerified" check={u => u.age >= 18}>
 *   <MatureContent />
 * </Can>
 *
 * @example
 * // OR logic — grant if user is admin OR has the "isPremium" rule
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
