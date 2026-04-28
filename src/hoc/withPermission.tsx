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

export interface WithPermissionProps {
  permitted: boolean;
  rbac: RBACContextValue;
}

// HOC 

/**
 * @example
 * // Class component
 * class AdminPanel extends Component<WithPermissionProps> {
 *   render() {
 *     if (!this.props.permitted) return <p>Access denied</p>;
 *     return <div>Admin content</div>;
 *   }
 * }
 * export default withPermission({ roles: "admin" })(AdminPanel);
 *
 * @example
 * // With fallback
 * const ProtectedView = withPermission(
 *   { permissions: "write:any" },
 *   { fallback: <ReadOnlyView /> }
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
 * @example
 * class MyWidget extends Component {
 *   render() {
 *     return (
 *       <RBACConsumer>
 *         {({ can, user }) => (
 *           can({ roles: "admin" }) ? <AdminView /> : <UserView />
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
