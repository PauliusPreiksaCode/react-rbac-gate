// User & role primitives

export interface RBACUser {
  roles: string[];
  [key: string]: unknown;
}

// Config

/**
 * Map of roleName → list of permission strings it grants directly.
 * @example { admin: ["read:any","write:any"], editor: ["read:any","write:own"] }
 */
export type RolesConfig = Record<string, string[]>;

/**
 * Map of roleName → list of roles it inherits from.
 * @example { editor: ["author"], author: ["viewer"] }
 */
export type HierarchyConfig = Record<string, string[]>;

/**
 * Named predicate functions evaluated against the current user.
 * @example { isAdult: u => u.age >= 18, isVerified: u => u.verified === true }
 */
export type CustomRules = Record<string, (user: RBACUser) => boolean>;

// Permission spec 

/**
 * A permission specification passed to `can()`, `<Can>`, `usePermission()`,
 * and `withPermission()`.
 */
export interface PermissionSpec {
  roles?: string | string[];
  permissions?: string | string[];
  anyPermission?: string | string[];
  rules?: string | string[];

  check?: (user: RBACUser) => boolean;

  require?: "all" | "any";
}

// Debug 

export interface DebugCondition {
  type: "roles" | "permissions" | "anyPermission" | "rules" | "check";
  tested: unknown;
  passed: boolean;
  reason: string;
}

/** Full debug report for a single `can()` call. */
export interface DebugReport {
  spec: PermissionSpec;
  conditions: DebugCondition[];
  result: boolean;
  combinator: "all" | "any";
}

// Context value

export interface RBACContextValue {
  user: RBACUser;
  allPermissions: ReadonlySet<string>;
  roles: RolesConfig;
  hierarchy: HierarchyConfig;
  /**
   * Evaluate a permission spec against the current user.
   * Returns `true` if the user satisfies all conditions in the spec.
   */
  can: (spec?: PermissionSpec) => boolean;
  /**
   * Same as `can()` but also returns a detailed debug report.
   * Only available when `debug` prop is set on the provider.
   */
  canWithDebug: (spec?: PermissionSpec) => { result: boolean; report: DebugReport };
}
