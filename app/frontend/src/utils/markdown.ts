function normalizePath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join('/');
}

export function rewriteMarkdownLinks(content: string, documentRelativePath: string): string {
  const baseSegments = documentRelativePath.split('/').slice(0, -1);

  return content.replace(/(!?\[[^\]]*]\()([^)]+)(\))/g, (_, prefix: string, rawPath: string, suffix: string) => {
    const trimmedPath = rawPath.trim();
    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
      return `${prefix}${trimmedPath}${suffix}`;
    }

    const targetPath = normalizePath([...baseSegments, trimmedPath].join('/'));
    if (!targetPath.startsWith('柯灵用/')) {
      return `${prefix}${trimmedPath}${suffix}`;
    }

    const rawUrl = `/raw/${encodeURI(targetPath.slice('柯灵用/'.length))}`;
    return `${prefix}${rawUrl}${suffix}`;
  });
}
