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

export const RBACContext = createContext<RBACContextValue | null>(null);

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

export interface RBACProviderProps {
  roles?: RolesConfig;
  hierarchy?: HierarchyConfig;
  user: RBACUser;
  customRules?: CustomRules;
  debug?: boolean | "verbose";
  children: ReactNode;
}

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
