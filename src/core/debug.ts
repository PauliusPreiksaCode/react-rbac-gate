import type { DebugReport } from "./types";

const PREFIX = "[react-rbac-gate]";

const PASS_COLOR = "color: #16a34a; font-weight: 600";
const FAIL_COLOR = "color: #dc2626; font-weight: 600";
const DIM_COLOR  = "color: #6b7280; font-weight: 400";
const BOLD       = "font-weight: 600; color: inherit";

/**
 * Log a DebugReport to the browser console in a structured, readable format.
 * Only called when `debug` prop is set on `<RBACProvider>`.
 */
export function logDebugReport(report: DebugReport): void {
  const { result, combinator, conditions, spec } = report;
  const label = result ? "PASSED" : "FAILED";

  console.groupCollapsed(
    `%c${PREFIX}  ${label} %c(combinator: ${combinator}, ${conditions.length} condition${conditions.length !== 1 ? "s" : ""})`,
    "color: #7c3aed; font-weight: 700",
    result ? PASS_COLOR : FAIL_COLOR,
    DIM_COLOR,
  );

  // Spec that was evaluated
  console.log("%cSpec", BOLD, spec);

  // Per-condition breakdown
  if (conditions.length > 0) {
    console.group("%cConditions", BOLD);
    for (const cond of conditions) {
      console.log(
        `%c${cond.passed ? "OK" : "FAIL"} [${cond.type}]%c ${cond.reason}`,
        cond.passed ? PASS_COLOR : FAIL_COLOR,
        DIM_COLOR,
      );
    }
    console.groupEnd();
  }

  // Quick summary
  const passed = conditions.filter(c => c.passed).length;
  console.log(
    `%cResult: %c${passed}/${conditions.length} conditions passed%c → ${result ? "GRANTED" : "DENIED"}`,
    BOLD,
    DIM_COLOR,
    result ? PASS_COLOR : FAIL_COLOR,
  );

  console.groupEnd();
}

/**
 * Warn about common configuration mistakes (called once on provider mount when debug mode is active).
 */
export function warnConfigIssues(
  roles: Record<string, string[]>,
  hierarchy: Record<string, string[]>,
  customRules: Record<string, unknown>,
): void {
  // Roles referenced in hierarchy but not defined in roles config
  for (const [role, parents] of Object.entries(hierarchy)) {
    for (const parent of parents) {
      if (!(parent in roles)) {
        console.warn(
          `${PREFIX} Hierarchy references undefined role "${parent}" as parent of "${role}". ` +
          `Add "${parent}" to your roles config or remove it from hierarchy.`,
        );
      }
    }
    if (!(role in roles)) {
      console.warn(
        `${PREFIX} Hierarchy contains role "${role}" that is not defined in roles config.`,
      );
    }
  }

  if (Object.keys(roles).length === 0) {
    console.warn(`${PREFIX} No roles defined in RBACProvider — all role checks will fail.`);
  }

  if (Object.keys(customRules).length === 0 && Object.keys(hierarchy).length === 0) {
    console.info(
      `${PREFIX} Running with roles-only config (no hierarchy, no custom rules). ` +
      "This is fine for simple use cases.",
    );
  }
}
