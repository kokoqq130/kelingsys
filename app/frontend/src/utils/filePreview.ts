export type PreviewFileType = 'markdown' | 'image' | 'pdf' | 'other';

export function inferPreviewFileType(
  relativePath?: string | null,
  explicitType?: string | null,
): PreviewFileType {
  const normalizedPath = (relativePath || '').toLowerCase();
  const normalizedType = (explicitType || '').toLowerCase();

  if (normalizedType === 'markdown' || normalizedPath.endsWith('.md')) {
    return 'markdown';
  }

  if (
    normalizedType === 'image' ||
    /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(normalizedPath)
  ) {
    return 'image';
  }

  if (normalizedType === 'pdf' || normalizedPath.endsWith('.pdf')) {
    return 'pdf';
  }

  return 'other';
}

export function resolvePreviewTitle(relativePath?: string | null, fallback?: string): string {
  if (!relativePath) {
    return fallback || '资料预览';
  }

  const fileName = relativePath.replace(/\\/g, '/').split('/').pop();
  return fileName || fallback || relativePath;
}

export function resolvePreviewPath(relativePath?: string | null, rawUrl?: string | null): string {
  if (relativePath) {
    return relativePath;
  }

  if (rawUrl?.startsWith('/raw/')) {
    return `柯灵用/${decodeURI(rawUrl.slice('/raw/'.length))}`;
  }

  return rawUrl || '资料预览';
}

export function buildPreviewHighlightTerms(
  ...sources: Array<string | null | undefined>
): string[] {
  const terms = new Set<string>();

  for (const source of sources) {
    if (!source) {
      continue;
    }

    const plainText = source
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) {
      continue;
    }

    if (plainText.length >= 2 && plainText.length <= 40) {
      terms.add(plainText);
    }

    for (const part of plainText.split(/[\s,，。；;、：:（）()【】\[\]<>《》"'“”‘’/\\|]+/g)) {
      const normalizedPart = part.trim();

      if (normalizedPart.length >= 2 && normalizedPart.length <= 24) {
        terms.add(normalizedPart);
      }
    }
  }

  return Array.from(terms).slice(0, 12);
}
