import { useCallback } from "react";
import { useRBACContext } from "../core/RBACProvider";
import type { PermissionSpec, RBACContextValue } from "../core/types";

/**
 * Returns a stable, memoised `can()` function that evaluates a
 * {@link PermissionSpec} against the current user.
 *
 * Use this hook in function components for **imperative** permission checks.
 * For declarative JSX gating prefer `<Can>`.
 *
 * @returns A memoised function `(spec?: PermissionSpec) => boolean`.
 *
 * @example
 * const can = usePermission();
 * const showDelete = can({ permissions: "delete:any", rules: "isVerified" });
 * const isEditor   = can({ roles: ["admin", "editor"] });
 *
 * return showDelete ? <DeleteButton /> : null;
 */
export function usePermission(): (spec?: PermissionSpec) => boolean {
  const { can } = useRBACContext();
  return useCallback(can, [can]);
}

/**
 * Returns the full {@link RBACContextValue} from the nearest `<RBACProvider>`.
 *
 * Use this when you need access to `user`, `allPermissions`, `canWithDebug`,
 * or the raw config in addition to simple permission checks.
 * For permission-only checks prefer {@link usePermission}.
 *
 * @returns The complete RBAC context value.
 *
 * @example
 * const { user, allPermissions, can, canWithDebug } = useRBAC();
 *
 * // Imperative check with full debug report
 * const { result, report } = canWithDebug({ roles: "admin" });
 * if (!result) console.table(report.conditions);
 */
export function useRBAC(): RBACContextValue {
  return useRBACContext();
}
