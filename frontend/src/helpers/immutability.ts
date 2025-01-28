export function toggleInSet<T>(set: Set<T>, value: T, include: boolean): Set<T> {
  const newSet = new Set(set);
  if (set.has(value) === include) {
    return set;
  }
  if (include) {
    newSet.add(value);
  } else {
    newSet.delete(value);
  }
  return newSet;
}
