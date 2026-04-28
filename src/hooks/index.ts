import { useCallback } from "react";
import { useRBACContext } from "../core/RBACProvider";
import type { PermissionSpec, RBACContextValue } from "../core/types";

/**
 * @example
 * const can = usePermission();
 * const showDelete = can({ permissions: "delete:any", rules: "isVerified" });
 * const isEditor   = can({ roles: ["admin", "editor"] });
 */
export function usePermission(): (spec?: PermissionSpec) => boolean {
  const { can } = useRBACContext();
  return useCallback(can, [can]);
}

/**
 * @example
 * const { user, allPermissions, can, canWithDebug } = useRBAC();
 */
export function useRBAC(): RBACContextValue {
  return useRBACContext();
}
