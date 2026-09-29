import { registerHooks } from "node:module";

// CSS Modules are supplied by Next.js in production; use class names in Node UI tests.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css")) {
      return { format: "module", shortCircuit: true,
        source: "export default new Proxy({}, { get: (_, name) => name });" };
    }
    return nextLoad(url, context);
  },
});

export function elements(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => elements(child, type));
  return [...(node.type === type ? [node] : []), ...elements(node.props?.children, type)];
}
