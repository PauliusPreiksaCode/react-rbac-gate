import type {
  RBACUser,
  CustomRules,
  PermissionSpec,
  DebugCondition,
  DebugReport,
} from "./types";

// Helpers 

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Evaluator 

/**
 * Evaluate a {@link PermissionSpec} against the current user and their resolved
 * permission set, returning both a boolean result and a structured debug report.
 *
 * Five independent condition types are checked (when present in the spec):
 * - `roles` — user must have **at least one** listed role.
 * - `permissions` — user must have **all** listed permissions.
 * - `anyPermission` — user must have **at least one** listed permission.
 * - `rules` — **all** named custom rules must return `true`.
 * - `check` — inline predicate must return `true`.
 *
 * Conditions are combined with AND by default; pass `require: "any"` for OR.
 * An empty or omitted spec always returns `{ result: true }`.
 *
 * @param spec - The permission spec to evaluate. Pass `undefined` to grant unconditionally.
 * @param user - The current user as provided to `<RBACProvider>`.
 * @param allPermissions - Flat set of all effective permissions (inherited included).
 * @param customRules - Named predicate functions registered on the provider.
 * @returns An object containing the boolean `result` and a full {@link DebugReport}.
 *
 * @example
 * const { result, report } = evaluate(
 *   { roles: "admin", permissions: "delete:any" },
 *   currentUser,
 *   resolvedPermissions,
 *   customRules,
 * );
 * if (!result) console.table(report.conditions);
 */
export function evaluate(
  spec: PermissionSpec | undefined,
  user: RBACUser,
  allPermissions: ReadonlySet<string>,
  customRules: CustomRules,
): { result: boolean; report: DebugReport } {
  const safeSpec = spec ?? {};
  const combinator = safeSpec.require === "any" ? "any" : "all";
  const conditions: DebugCondition[] = [];

  // Role check
  const requiredRoles = toArray(safeSpec.roles);
  if (requiredRoles.length > 0) {
    const userRoles = user.roles ?? [];
    const matched = requiredRoles.filter(r => userRoles.includes(r));
    const passed = matched.length > 0;
    conditions.push({
      type: "roles",
      tested: requiredRoles,
      passed,
      reason: passed
        ? `User has role "${matched[0]}"${matched.length > 1 ? ` (+${matched.length - 1} more)` : ""}`
        : `User roles [${userRoles.join(", ")}] do not include any of [${requiredRoles.join(", ")}]`,
    });
  }

  // Permissions check (ALL required) 
  const requiredPerms = toArray(safeSpec.permissions);
  if (requiredPerms.length > 0) {
    const missing = requiredPerms.filter(p => !allPermissions.has(p));
    const passed = missing.length === 0;
    conditions.push({
      type: "permissions",
      tested: requiredPerms,
      passed,
      reason: passed
        ? `User has all required permissions: [${requiredPerms.join(", ")}]`
        : `Missing permissions: [${missing.join(", ")}]`,
    });
  }

  // anyPermission check (at least ONE) 
  const anyPerms = toArray(safeSpec.anyPermission);
  if (anyPerms.length > 0) {
    const matched = anyPerms.filter(p => allPermissions.has(p));
    const passed = matched.length > 0;
    conditions.push({
      type: "anyPermission",
      tested: anyPerms,
      passed,
      reason: passed
        ? `User has "${matched[0]}" (satisfies anyPermission)`
        : `User has none of [${anyPerms.join(", ")}]`,
    });
  }

  // Named custom rules (ALL must pass) 
  const requiredRules = toArray(safeSpec.rules);
  if (requiredRules.length > 0) {
    const results = requiredRules.map(name => {
      const fn = customRules[name];
      if (!fn) {
        return { name, passed: false, reason: `Rule "${name}" is not defined in customRules` };
      }
      let passed = false;
      try {
        passed = fn(user);
      } catch (err) {
        return { name, passed: false, reason: `Rule "${name}" threw: ${String(err)}` };
      }
      return {
        name,
        passed,
        reason: passed
          ? `Rule "${name}" passed`
          : `Rule "${name}" returned false`,
      };
    });

    const failed = results.filter(r => !r.passed);
    const allPassed = failed.length === 0;

    conditions.push({
      type: "rules",
      tested: requiredRules,
      passed: allPassed,
      reason: allPassed
        ? `All rules passed: [${requiredRules.join(", ")}]`
        : `Failed rules: ${failed.map(r => `"${r.name}" (${r.reason})`).join(", ")}`,
    });
  }

  // 5. Inline predicate
  if (safeSpec.check !== undefined) {
    let passed = false;
    let reason = "";
    try {
      passed = safeSpec.check(user);
      reason = passed
        ? "Inline check() returned true"
        : "Inline check() returned false";
    } catch (err) {
      reason = `Inline check() threw: ${String(err)}`;
    }
    conditions.push({ type: "check", tested: "[Function]", passed, reason });
  }

  // Combine
  const result =
    conditions.length === 0
      ? true
      : combinator === "any"
        ? conditions.some(c => c.passed)
        : conditions.every(c => c.passed);

  return {
    result,
    report: { spec: safeSpec, conditions, result, combinator },
  };
}
