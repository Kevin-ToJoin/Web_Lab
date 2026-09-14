import '@testing-library/jest-dom';

// Node 24+ exposes a Web Storage `localStorage` of its own. Without a valid
// --localstorage-file it hands back an empty object with none of Storage's
// methods, and because it lives on globalThis — which IS `window` under vitest —
// it shadows the store jsdom installs. The result was `localStorage.clear is not
// a function` in the hook below, failing all 63 tests on a contributor's machine
// while CI, pinned to Node 22 (no such global), stayed green and hid it.
//
// The global is a configurable accessor, so replace it with a working in-memory
// Storage when that is what we are looking at. The 10 modules that persist state
// through `localStorage` then share one store with the cleanup below.
function installWorkingLocalStorage(): void {
  const current = (globalThis as { localStorage?: Partial<Storage> }).localStorage;
  if (current && typeof current.clear === 'function') return;

  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

installWorkingLocalStorage();

// Keep tests isolated: clear persisted state (cart, bug reports) before each test.
beforeEach(() => {
  localStorage.clear();
});
