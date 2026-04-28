# react-rbac-gate

Lightweight, flexible role-based access control for React.

- ✅ **Role hierarchy** — roles can inherit permissions from parent roles
- ✅ **Granular permissions** — `"write:own"`, `"delete:any"`, or any string you define
- ✅ **Custom rules** — arbitrary predicates like `user.age >= 18` or `user.plan === "premium"`
- ✅ **Debug mode** — structured console output explaining every access decision
- ✅ **Tree-shakeable** — HOC in a separate entry point; only import what you use
- ✅ **TypeScript-first** — full types exported, zero `any`
- ✅ **Tiny** — no runtime dependencies beyond React itself

---

## Installation

```bash
npm install react-rbac-gate
# or
yarn add react-rbac-gate
# or
pnpm add react-rbac-gate
```

React 17+ is required as a peer dependency.

---

## Quick start

```tsx
import { RBACProvider, Can, usePermission } from "react-rbac-gate";

const roles = {
  admin:  ["read:any", "write:any", "delete:any", "manage:users"],
  editor: ["read:any", "write:own", "publish:post"],
  viewer: ["read:any"],
};

const hierarchy = {
  editor: ["viewer"], // editor inherits all viewer permissions
};

const customRules = {
  isAdult:    (user) => user.age >= 18,
  isVerified: (user) => user.verified === true,
};

const currentUser = {
  roles: ["editor"],
  age: 27,
  verified: true,
  plan: "free",
};

function App() {
  return (
    <RBACProvider
      roles={roles}
      hierarchy={hierarchy}
      user={currentUser}
      customRules={customRules}
      debug // remove in production
    >
      <Dashboard />
    </RBACProvider>
  );
}
```

---

## API

### `<RBACProvider>`

Wrap your application (or any subtree) with this provider.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `RBACUser` | required | The current user. Must have a `roles: string[]` field. |
| `roles` | `RolesConfig` | `{}` | Map of role → permission strings. |
| `hierarchy` | `HierarchyConfig` | `{}` | Map of role → parent roles (permissions are inherited). |
| `customRules` | `CustomRules` | `{}` | Named predicate functions: `{ isAdult: u => u.age >= 18 }`. |
| `debug` | `boolean \| "verbose"` | `false` | Log access decisions to the console. `"verbose"` logs passing checks too. |

#### Role hierarchy

Permissions flow from parent → child. The graph is resolved once on mount and
cached — cycles are detected and safely skipped.

```ts
const hierarchy = {
  admin:  [],              // top of the tree
  editor: ["author"],      // editor gets all author permissions
  author: ["viewer"],      // author gets all viewer permissions
  viewer: [],
};
```

---

### `<Can>`

Declarative permission gate. Renders `children` if the check passes, `fallback` otherwise.

All `PermissionSpec` fields are available as direct props.

```tsx
// Role check
<Can roles="admin">
  <DeleteButton />
</Can>

// Require ALL permissions
<Can permissions={["write:own", "publish:post"]} fallback={<ReadOnly />}>
  <Editor />
</Can>

// Require ANY permission (OR logic within the condition)
<Can anyPermission={["write:own", "write:any"]}>
  <WriteAccess />
</Can>

// Custom rule
<Can rules="isAdult" fallback={<AgeGate />}>
  <MatureContent />
</Can>

// Inline predicate (no need to name the rule)
<Can check={u => u.plan === "premium"}>
  <PremiumDashboard />
</Can>

// Combine multiple conditions (all must pass by default)
<Can roles={["admin", "editor"]} rules="isVerified" permissions="publish:post">
  <PublishPanel />
</Can>

// Switch to OR logic across top-level conditions
<Can roles="admin" rules="isPremium" require="any">
  <SpecialFeature />
</Can>
```

---

### `usePermission()`

Hook that returns a `can(spec)` function bound to the current user.

```tsx
function DeleteButton({ postId }: { postId: string }) {
  const can = usePermission();

  if (!can({ permissions: "delete:any" })) return null;

  return <button onClick={() => deletePost(postId)}>Delete</button>;
}
```

---

### `useRBAC()`

Returns the full RBAC context — useful when you need the user object,
the resolved `allPermissions` set, or the debug-aware `canWithDebug()`.

```tsx
function PermissionBadge() {
  const { user, allPermissions, can, canWithDebug } = useRBAC();

  // canWithDebug always returns a report, even when debug is off
  const { result, report } = canWithDebug({ roles: "admin" });

  return (
    <div>
      <p>Logged in as: {user.name as string}</p>
      <p>Permissions: {[...allPermissions].join(", ")}</p>
    </div>
  );
}
```

---

### `withPermission(spec?, options?)` — HOC for class components

Import from the separate entry point to keep your bundle lean:

```tsx
import { withPermission, RBACConsumer } from "react-rbac-gate/hoc";
```

#### `withPermission`

Injects `permitted: boolean` and `rbac: RBACContextValue` into the wrapped component.

```tsx
import { Component } from "react";
import { withPermission } from "react-rbac-gate/hoc";
import type { WithPermissionProps } from "react-rbac-gate/hoc";

interface Props extends WithPermissionProps {
  title: string;
}

class AdminPanel extends Component<Props> {
  render() {
    const { permitted, title, rbac } = this.props;
    if (!permitted) return <p>Access denied.</p>;
    return (
      <div>
        <h1>{title}</h1>
        <p>Welcome, {rbac.user.name as string}</p>
      </div>
    );
  }
}

export default withPermission(
  { roles: "admin" },
  { fallback: <p>Admins only.</p> }
)(AdminPanel);
```

#### `RBACConsumer`

Render-prop alternative for class components that need more control:

```tsx
import { RBACConsumer } from "react-rbac-gate/hoc";

class MyWidget extends Component {
  render() {
    return (
      <RBACConsumer>
        {({ can, user }) =>
          can({ roles: "admin" }) ? <AdminView /> : <UserView />
        }
      </RBACConsumer>
    );
  }
}
```

---

## PermissionSpec reference

All conditions are **AND-ed together** by default.
Set `require: "any"` to switch to OR logic across top-level conditions.

| Field | Type | Behaviour |
|-------|------|-----------|
| `roles` | `string \| string[]` | User must have **at least one** of these roles |
| `permissions` | `string \| string[]` | User must have **all** of these permissions |
| `anyPermission` | `string \| string[]` | User must have **at least one** of these permissions |
| `rules` | `string \| string[]` | Named custom rules that must **all** return `true` |
| `check` | `(user) => boolean` | Inline predicate evaluated against the user object |
| `require` | `"all" \| "any"` | How to combine results (default: `"all"`) |

---

## Debug mode

Enable debug mode on the provider during development:

```tsx
<RBACProvider debug user={user} roles={roles}>
  <App />
</RBACProvider>
```

Every failing `can()` call logs a collapsed group to the browser console:

```
▶ [react-rbac-gate]  FAILED (combinator: all, 2 conditions)
    Spec      { roles: "admin", rules: "isVerified" }
  ▶ Conditions
      OK [roles]  User roles [editor] do not include any of [admin]
      FAIL [rules]  Rule "isVerified" passed
    Result: 1/2 conditions passed → DENIED
```

Use `debug="verbose"` to also log passing checks.

On mount, debug mode also warns about common configuration mistakes:
- Roles referenced in `hierarchy` that are not defined in `roles`
- Empty `roles` config

---

## TypeScript

All types are exported:

```ts
import type {
  RBACUser,
  RolesConfig,
  HierarchyConfig,
  CustomRules,
  PermissionSpec,
  DebugReport,
  DebugCondition,
  RBACContextValue,
} from "react-rbac-gate";
```

For the HOC types:

```ts
import type { WithPermissionProps } from "react-rbac-gate/hoc";
```

---

## Tree-shaking

The library has two entry points:

| Import path | What it includes |
|-------------|-----------------|
| `react-rbac-gate` | `RBACProvider`, `Can`, `usePermission`, `useRBAC` |
| `react-rbac-gate/hoc` | `withPermission`, `RBACConsumer` |

If you only use hooks and `<Can>`, never import from `/hoc` — the class-component
code stays out of your bundle entirely.

---

## Performance notes

- **Permission graph is resolved once** per unique combination of `user.roles`, `roles`, and `hierarchy`, and cached via `useMemo`.
- **Cycle detection** in the hierarchy resolver prevents infinite loops.
- **`can()` calls are synchronous and cheap** — they operate on the pre-built `Set<string>` in memory.
- Define `roles` and `hierarchy` **outside your component tree** (or in a `useMemo`) so the provider doesn't recompute on every parent render.

```tsx
//  Good — stable reference
const ROLES = { admin: ["write:any"], viewer: ["read:any"] };

function App() {
  return <RBACProvider roles={ROLES} user={user}>...</RBACProvider>;
}

// Avoid — new object on every render triggers recompute
function App() {
  return (
    <RBACProvider roles={{ admin: ["write:any"] }} user={user}>
      ...
    </RBACProvider>
  );
}
```

---

## License

MIT
