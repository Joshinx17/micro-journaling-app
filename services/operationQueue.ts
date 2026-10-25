// Serializes this app's operations; external editors still require version checks.
export function createOperationQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.catch(() => {});
    return result;
  };
}
