// User & role primitives

/**
 * Represents the authenticated user passed to `<RBACProvider>`.
 *
 * At minimum the user must have a `roles` array. Any additional properties
 * (e.g. `age`, `verified`) are available to `customRules` predicates and
 * inline `check()` functions inside a {@link PermissionSpec}.
 *
 * @example
 * const user: RBACUser = {
 *   roles: ["editor", "author"],
 *   verified: true,
 *   age: 25,
 * };
 */
export interface RBACUser {
  /** Roles currently assigned to this user. */
  roles: string[];
  [key: string]: unknown;
}

// Config

/**
 * Maps each role name to the permission strings it directly grants.
 *
 * Combine with {@link HierarchyConfig} to let child roles inherit permissions
 * from parent roles automatically.
 *
 * @example
 * const roles: RolesConfig = {
 *   admin:  ["read:any", "write:any", "delete:any"],
 *   editor: ["read:any", "write:own"],
 *   viewer: ["read:any"],
 * };
 */
export type RolesConfig = Record<string, string[]>;

/**
 * Maps each role to the parent roles it inherits from.
 *
 * The resolver walks the graph transitively, so permissions propagate through
 * any number of inheritance levels. Cycles are detected and silently ignored.
 *
 * @example
 * const hierarchy: HierarchyConfig = {
 *   admin:  ["editor"],   // admin inherits from editor
 *   editor: ["viewer"],   // editor inherits from viewer
 * };
 */
export type HierarchyConfig = Record<string, string[]>;

/**
 * Named predicate functions that can be referenced by name inside a
 * {@link PermissionSpec}'s `rules` field.
 *
 * Each function receives the current {@link RBACUser} and must return a boolean.
 * Thrown exceptions are caught by the evaluator and treated as `false`.
 *
 * @example
 * const customRules: CustomRules = {
 *   isVerified: u => u.verified === true,
 *   isAdult:    u => typeof u.age === "number" && u.age >= 18,
 * };
 */
export type CustomRules = Record<string, (user: RBACUser) => boolean>;

// Permission spec

/**
 * Describes a permission check passed to `can()`, `<Can>`, {@link usePermission},
 * and `withPermission`. All fields are optional — omitting the spec entirely
 * (or passing `undefined`) grants access unconditionally.
 *
 * By default **every condition that is present** must pass (`require: "all"`).
 * Set `require: "any"` to grant access when **at least one** condition passes.
 *
 * @example
 * // Must have the "admin" role AND the "delete:any" permission (default AND logic)
 * can({ roles: "admin", permissions: "delete:any" })
 *
 * @example
 * // Grant access if user is admin OR has the "write:any" permission
 * can({ roles: "admin", anyPermission: "write:any", require: "any" })
 *
 * @example
 * // Named custom rule combined with an inline predicate
 * can({ rules: "isVerified", check: u => u.age >= 18 })
 */
export interface PermissionSpec {
  /**
   * One or more role names. Passes when the user has **at least one** of the
   * listed roles (OR semantics within this field regardless of `require`).
   */
  roles?: string | string[];

  /**
   * One or more permission strings. **All** listed permissions must be present
   * in the user's effective permission set (inherited permissions included).
   */
  permissions?: string | string[];

  /**
   * One or more permission strings. Passes when the user has **at least one**
   * of them in their effective permission set.
   */
  anyPermission?: string | string[];

  /**
   * One or more named rules from the `customRules` config.
   * **All** named rules must return `true` for this condition to pass.
   */
  rules?: string | string[];

  /**
   * Inline predicate. Receives the full {@link RBACUser} object and must return
   * a boolean. Exceptions thrown inside the function are caught and treated as `false`.
   */
  check?: (user: RBACUser) => boolean;

  /**
   * How to combine multiple conditions when more than one field is set.
   * - `"all"` *(default)* — every present condition must pass.
   * - `"any"` — at least one present condition must pass.
   */
  require?: "all" | "any";
}

// Debug

/**
 * The evaluation result for a single condition within a `can()` call.
 * Returned as part of {@link DebugReport}.
 */
export interface DebugCondition {
  /** Which field of {@link PermissionSpec} produced this condition. */
  type: "roles" | "permissions" | "anyPermission" | "rules" | "check";
  /** The raw value that was tested (e.g. the array of role names). */
  tested: unknown;
  /** `true` if this condition passed, `false` otherwise. */
  passed: boolean;
  /** Human-readable explanation of why the condition passed or failed. */
  reason: string;
}

/**
 * Full debug report returned by {@link RBACContextValue.canWithDebug}.
 * Inspect this to understand exactly why access was granted or denied.
 *
 * @example
 * const { result, report } = canWithDebug({ roles: "admin" });
 * // report.conditions → [{ type: "roles", passed: false, reason: "..." }]
 * console.table(report.conditions);
 */
export interface DebugReport {
  /** The original {@link PermissionSpec} that was evaluated. */
  spec: PermissionSpec;
  /** Per-condition breakdown of the evaluation. */
  conditions: DebugCondition[];
  /** Final access decision (`true` = granted, `false` = denied). */
  result: boolean;
  /** The combinator applied across conditions (`"all"` or `"any"`). */
  combinator: "all" | "any";
}

// Context value

/**
 * Value exposed by the RBAC context and returned by {@link useRBAC}.
 * Provides read access to the current user, resolved permissions, raw config,
 * and the evaluation functions.
 *
 * Consume this via the {@link useRBAC} hook or `RBACConsumer`.
 */
export interface RBACContextValue {
  /** The current user object supplied to `<RBACProvider user={...}>`. */
  user: RBACUser;

  /**
   * Flat, immutable set of all effective permission strings for the current user,
   * including permissions inherited through the role hierarchy.
   */
  allPermissions: ReadonlySet<string>;

  /** The roles config supplied to `<RBACProvider roles={...}>`. */
  roles: RolesConfig;

  /** The hierarchy config supplied to `<RBACProvider hierarchy={...}>`. */
  hierarchy: HierarchyConfig;

  /**
   * Evaluate a {@link PermissionSpec} against the current user.
   * Returns `true` when the user satisfies every condition in the spec
   * (or when the spec is omitted/empty).
   *
   * @example
   * const { can } = useRBAC();
   * if (can({ roles: "admin" })) {
   *   // render admin UI
   * }
   */
  can: (spec?: PermissionSpec) => boolean;

  /**
   * Same as `can()` but also returns a full {@link DebugReport} explaining the
   * outcome of each condition. Useful for debugging access-control decisions.
   *
   * @example
   * const { canWithDebug } = useRBAC();
   * const { result, report } = canWithDebug({ permissions: "delete:any" });
   * console.log(report.conditions);
   */
  canWithDebug: (spec?: PermissionSpec) => { result: boolean; report: DebugReport };
}
