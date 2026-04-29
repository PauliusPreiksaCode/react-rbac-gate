/**
 * **react-rbac-gate** — Lightweight, flexible role-based access control for React.
 *
 * ## Quick start
 *
 * ```tsx
 * // 1. Wrap your app
 * <RBACProvider
 *   user={{ roles: ["editor"] }}
 *   roles={{ editor: ["read:any", "write:own"], viewer: ["read:any"] }}
 *   hierarchy={{ editor: ["viewer"] }}
 * >
 *   <App />
 * </RBACProvider>
 *
 * // 2. Gate JSX declaratively
 * <Can permissions="write:own" fallback={<ReadOnly />}>
 *   <Editor />
 * </Can>
 *
 * // 3. Or check imperatively in a hook
 * const can = usePermission();
 * if (can({ roles: "admin" })) { ... }
 * ```
 *
 * ## Entry points
 * - `react-rbac-gate` — hooks, `<Can>`, provider, and all types (tree-shakeable).
 * - `react-rbac-gate/hoc` — {@link hoc.withPermission | withPermission} and {@link hoc.RBACConsumer | RBACConsumer} for class components.
 *
 * @packageDocumentation
 */

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
