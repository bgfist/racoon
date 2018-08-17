export function isImmutable(value: any) {
  return value && typeof value.get === 'function'
}
