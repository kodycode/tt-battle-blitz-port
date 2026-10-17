// Lingo `me` semantics for ancestor handlers.
//
// In Lingo, when a child script calls `ancestor.foo()` explicitly, `me` inside the ancestor's foo is the
// ancestor object, so `me.bar()` there runs the ANCESTOR's bar even if the child overrides bar.
// When the child has no foo, the message is passed to the ancestor with `me` still the child, so
// `me.bar()` runs the child's bar. TypeScript's super.foo() always dispatches `this.bar()` virtually.
//
// lingoMe(this, Class_Base, 'foo') returns the object to use as `me` inside Class_Base.foo:
//   - `this` when foo was reached by normal dispatch (no subclass overrides foo),
//   - otherwise a view of `this` whose methods resolve from Class_Base.prototype (ancestor semantics).
// Properties always read and write the real object.

const viewCache = new WeakMap<object, Map<Function, object>>();

export function lingoMe<T extends object>(self: T, cls: Function, method: string): T {
  const own = (cls.prototype as any)[method];
  if ((self as any)[method] === own) return self;
  let byClass = viewCache.get(self);
  if (!byClass) {
    byClass = new Map();
    viewCache.set(self, byClass);
  }
  let view = byClass.get(cls) as T | undefined;
  if (!view) {
    const proto = cls.prototype;
    view = new Proxy(self, {
      get(target, key, receiver) {
        const fromProto = Reflect.get(proto, key, receiver);
        if (typeof fromProto === 'function' && !Object.prototype.hasOwnProperty.call(target, key)) return fromProto;
        return Reflect.get(target, key, target);
      },
      set(target, key, value) {
        return Reflect.set(target, key, value, target);
      },
    });
    byClass.set(cls, view);
  }
  return view;
}
