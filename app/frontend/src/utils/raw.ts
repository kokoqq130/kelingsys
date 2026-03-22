export function toRawUrl(relativePath?: string | null): string | null {
  if (!relativePath) {
    return null;
  }

  const prefix = '柯灵用/';
  if (!relativePath.startsWith(prefix)) {
    return null;
  }

  return `/raw/${encodeURI(relativePath.slice(prefix.length)).replace(/%5C/g, '/')}`;
}
