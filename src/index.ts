// ─── Core ─────────────────────────────────────────────────────────────────────
export { RBACProvider }      from "./core/RBACProvider";
export type { RBACProviderProps } from "./core/RBACProvider";

// ─── Components ───────────────────────────────────────────────────────────────
export { Can }               from "./components/Can";
export type { CanProps }     from "./components/Can";

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { usePermission, useRBAC } from "./hooks";

// ─── Types (re-exported for consumers writing TypeScript) ─────────────────────
export type {
  RBACUser,
  RolesConfig,
  HierarchyConfig,
  CustomRules,
  PermissionSpec,
  DebugReport,
  DebugCondition,
  RBACContextValue,
} from "./core/types";

// ─── NOTE: withPermission and RBACConsumer are in a separate entry point ──────
// Import from "react-rbac-gate/hoc" to avoid pulling in class-component code
// when you only use hooks/Can.
//
// import { withPermission, RBACConsumer } from "react-rbac-gate/hoc";
