import {
  Component,
  type ComponentType,
  type ReactNode,
  createContext,
  useContext,
} from "react";
import { RBACContext } from "../core/RBACProvider";
import type { RBACContextValue, PermissionSpec } from "../core/types";

// Props injected by the HOC

/**
 * Props automatically injected by {@link withPermission} into the wrapped component.
 *
 * Your component should extend (or include) this interface in its own props type
 * so TypeScript knows these fields are available.
 */
export interface WithPermissionProps {
  /** `true` when the user satisfies the {@link PermissionSpec} passed to `withPermission()`. */
  permitted: boolean;
  /** Full {@link RBACContextValue} — exposes `can`, `user`, `allPermissions`, etc. */
  rbac: RBACContextValue;
}

// HOC

/**
 * Higher-order component that wraps a class or function component with a
 * {@link PermissionSpec} check. The wrapped component receives {@link WithPermissionProps}
 * (`permitted` and `rbac`) as additional props.
 *
 * When access is denied and `options.fallback` is provided, the fallback is
 * rendered instead of the wrapped component (which does **not** mount at all).
 * Without a fallback, the component mounts with `permitted: false`.
 *
 * @typeParam P - Props of the component being wrapped (must extend {@link WithPermissionProps}).
 * @param spec - Permission spec to evaluate. Omit or pass `undefined` to always grant access.
 * @param options.fallback - Node rendered when access is denied. Defaults to `null`.
 * @param options.displayName - Custom `displayName` for the wrapper visible in React DevTools.
 * @returns A HOC function that accepts the component to wrap.
 *
 * @throws {Error} When the wrapped component is rendered outside of `<RBACProvider>`.
 *
 * @example
 * // Class component — receives `permitted` as a prop
 * class AdminPanel extends Component<WithPermissionProps> {
 *   render() {
 *     if (!this.props.permitted) return <p>Access denied</p>;
 *     return <div>Admin content</div>;
 *   }
 * }
 * export default withPermission({ roles: "admin" })(AdminPanel);
 *
 * @example
 * // Provide a fallback rendered when access is denied
 * const ProtectedView = withPermission(
 *   { permissions: "write:any" },
 *   { fallback: <ReadOnlyView /> },
 * )(EditView);
 */
export function withPermission<P extends WithPermissionProps>(
  spec?: PermissionSpec,
  options: {
    fallback?: ReactNode;
    displayName?: string;
  } = {},
) {
  return function wrap(WrappedComponent: ComponentType<P>) {
    const { fallback = null, displayName } = options;

    function PermissionWrapper(ownProps: Omit<P, keyof WithPermissionProps>) {
      const ctx = useContext(RBACContext);
      if (!ctx) {
        throw new Error(
          "[react-rbac-gate] withPermission: wrapped component is not inside <RBACProvider>.",
        );
      }

      const permitted = ctx.can(spec);

      if (!permitted && fallback !== undefined) {
        return fallback;
      }

      const props = { ...ownProps, permitted, rbac: ctx } as unknown as P;
      return <WrappedComponent {...props} />;
    }

    const wrappedName =
      WrappedComponent.displayName ?? WrappedComponent.name ?? "Component";
    PermissionWrapper.displayName =
      displayName ?? `withPermission(${wrappedName})`;

    return PermissionWrapper;
  };
}

// Class component helper

/**
 * Render-props component for accessing RBAC state inside **class components**
 * that cannot use hooks.
 *
 * Renders its `children` function with the full {@link RBACContextValue}, giving
 * access to `can`, `canWithDebug`, `user`, `allPermissions`, and the raw config.
 *
 * For function components prefer `useRBAC` or `usePermission`.
 *
 * @throws {Error} When rendered outside of `<RBACProvider>`.
 *
 * @example
 * class MyWidget extends Component {
 *   render() {
 *     return (
 *       <RBACConsumer>
 *         {({ can, user }) => (
 *           can({ roles: "admin" }) ? <AdminView /> : <UserView user={user} />
 *         )}
 *       </RBACConsumer>
 *     );
 *   }
 * }
 */
export class RBACConsumer extends Component<{
  children: (ctx: RBACContextValue) => ReactNode;
}> {
  static contextType = RBACContext;
  declare context: RBACContextValue | null;

  render() {
    if (!this.context) {
      throw new Error(
        "[react-rbac-gate] <RBACConsumer> must be rendered inside <RBACProvider>.",
      );
    }
    return this.props.children(this.context);
  }
}
