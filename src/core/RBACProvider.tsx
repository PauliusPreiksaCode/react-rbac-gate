import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import type {
  RBACUser,
  RolesConfig,
  HierarchyConfig,
  CustomRules,
  PermissionSpec,
  DebugReport,
  RBACContextValue,
} from "./types";

import { buildPermissionSet } from "./resolver";
import { evaluate } from "./evaluator";
import { logDebugReport, warnConfigIssues } from "./debug";

// Context

/**
 * React context that carries the RBAC state tree.
 *
 * Consumed automatically by {@link useRBAC}, {@link usePermission}, `<Can>`,
 * {@link hoc.withPermission | withPermission}, and {@link hoc.RBACConsumer | RBACConsumer}.
 * You rarely need to read this directly — prefer the hooks or the declarative components instead.
 */
export const RBACContext = createContext<RBACContextValue | null>(null);

/**
 * Low-level hook that returns the raw {@link RBACContextValue} from the nearest
 * `<RBACProvider>`. Throws a descriptive error when called outside a provider.
 *
 * Prefer {@link useRBAC} or {@link usePermission} in application code.
 *
 * @throws {Error} When rendered outside of `<RBACProvider>`.
 *
 * @example
 * const ctx = useRBACContext();
 * ctx.can({ roles: "admin" });
 */
export function useRBACContext(): RBACContextValue {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    throw new Error(
      "[react-rbac-gate] useRBACContext (and all hooks/components that use it) " +
      "must be rendered inside <RBACProvider>.",
    );
  }
  return ctx;
}

// Provider

/**
 * Props for {@link RBACProvider}.
 */
export interface RBACProviderProps {
  /**
   * Maps each role name to the permission strings it directly grants.
   *
   * @example
   * roles={{ admin: ["read:any", "write:any"], viewer: ["read:any"] }}
   */
  roles?: RolesConfig;

  /**
   * Maps each role to its parent roles for transitive permission inheritance.
   *
   * @example
   * hierarchy={{ admin: ["editor"], editor: ["viewer"] }}
   */
  hierarchy?: HierarchyConfig;

  /**
   * The currently authenticated user. Must include a `roles` array.
   * Additional properties (e.g. `verified`, `age`) are accessible in
   * `customRules` and inline `check()` predicates.
   */
  user: RBACUser;

  /**
   * Named predicate functions available as the `rules` field of a
   * {@link PermissionSpec}. Each function receives the current user.
   *
   * @example
   * customRules={{ isVerified: u => u.verified === true }}
   */
  customRules?: CustomRules;

  /**
   * Enable debug logging to the browser console.
   * - `true` — logs only **failed** checks.
   * - `"verbose"` — logs **all** checks (passed and failed).
   *
   * Debug output includes a per-condition breakdown via {@link DebugReport}.
   */
  debug?: boolean | "verbose";

  /** Children rendered inside the RBAC context. */
  children: ReactNode;
}

/**
 * Root provider that wires up RBAC for a React subtree.
 *
 * Wrap your application (or any subtree) with `<RBACProvider>` and supply the
 * current user, roles config, and optionally a hierarchy and custom rules.
 * All descendants can then use {@link Can}, {@link usePermission}, {@link useRBAC},
 * {@link hoc.withPermission | withPermission}, and {@link hoc.RBACConsumer | RBACConsumer}.
 *
 * @example
 * // Minimal — roles only
 * <RBACProvider
 *   user={{ roles: ["editor"] }}
 *   roles={{
 *     editor: ["read:any", "write:own"],
 *     viewer: ["read:any"],
 *   }}
 * >
 *   <App />
 * </RBACProvider>
 *
 * @example
 * // With role hierarchy, custom rules, and debug mode
 * <RBACProvider
 *   user={{ roles: ["editor"], verified: true, age: 20 }}
 *   roles={{
 *     admin:  ["delete:any"],
 *     editor: ["write:own"],
 *     viewer: ["read:any"],
 *   }}
 *   hierarchy={{ admin: ["editor"], editor: ["viewer"] }}
 *   customRules={{ isVerified: u => u.verified === true }}
 *   debug="verbose"
 * >
 *   <App />
 * </RBACProvider>
 */
export function RBACProvider({
  roles = {},
  hierarchy = {},
  user,
  customRules = {},
  debug = false,
  children,
}: RBACProviderProps) {

  const allPermissions = useMemo(
    () => buildPermissionSet(user.roles ?? [], roles, hierarchy),
    [
      (user.roles ?? []).join(","),
      JSON.stringify(roles),
      JSON.stringify(hierarchy),
    ],
  );

  // Debug: warn about config issues on mount
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    if (debug) warnConfigIssues(roles, hierarchy, customRules);
  }, []);

  // Core evaluator
  function canWithDebug(spec?: PermissionSpec): { result: boolean; report: DebugReport } {
    const outcome = evaluate(spec, user, allPermissions, customRules);

    if (debugRef.current) {
      if (debugRef.current === "verbose" || !outcome.result) {
        logDebugReport(outcome.report);
      }
    }

    return outcome;
  }

  function can(spec?: PermissionSpec): boolean {
    return canWithDebug(spec).result;
  }

  const contextValue = useMemo<RBACContextValue>(
    () => ({ user, allPermissions, roles, hierarchy, can, canWithDebug }),
    [user, allPermissions],
  );

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
}
