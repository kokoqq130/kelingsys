import { jsonGet } from '@/api/client';
import type {
  AdmissionPeriodDetail,
  AdmissionPeriodSummary,
  DocumentDetail,
  DocumentItem,
  EventItem,
  FileItem,
  HealthResponse,
  LabItem,
  MedicationsResponse,
  OverviewResponse,
  SearchItem,
  SearchIndexItem,
} from '@/types/api';

const staticCache = new Map<string, Promise<unknown>>();

function readStaticJson<T>(path: string): Promise<T> {
  const normalizedPath = `/static-data/${path.replace(/^\/+/, '')}`;

  if (!staticCache.has(normalizedPath)) {
    staticCache.set(
      normalizedPath,
      jsonGet<T>(normalizedPath).catch(error => {
        staticCache.delete(normalizedPath);
        throw error;
      }),
    );
  }

  return staticCache.get(normalizedPath) as Promise<T>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchSnippet(content: string, keyword: string): string {
  const normalizedContent = normalizeSearchText(content);
  const normalizedKeyword = keyword.trim();

  if (!normalizedContent) {
    return '';
  }

  if (!normalizedKeyword) {
    return escapeHtml(normalizedContent.slice(0, 96));
  }

  const lowerContent = normalizedContent.toLowerCase();
  const lowerKeyword = normalizedKeyword.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerKeyword);

  if (matchIndex === -1) {
    return escapeHtml(normalizedContent.slice(0, 120));
  }

  const snippetStart = Math.max(0, matchIndex - 24);
  const snippetEnd = Math.min(normalizedContent.length, matchIndex + normalizedKeyword.length + 48);
  const snippet = normalizedContent.slice(snippetStart, snippetEnd);
  const relativeIndex = matchIndex - snippetStart;

  const before = escapeHtml(snippet.slice(0, relativeIndex));
  const hit = escapeHtml(snippet.slice(relativeIndex, relativeIndex + normalizedKeyword.length));
  const after = escapeHtml(snippet.slice(relativeIndex + normalizedKeyword.length));
  const prefix = snippetStart > 0 ? '...' : '';
  const suffix = snippetEnd < normalizedContent.length ? '...' : '';

  return `${prefix}${before}<mark>${hit}</mark>${after}${suffix}`;
}

async function loadSearchIndex(): Promise<SearchIndexItem[]> {
  return readStaticJson<SearchIndexItem[]>('search-index.json');
}

export const staticMedicalApi = {
  getHealth: () => readStaticJson<HealthResponse>('health.json'),
  getOverview: () => readStaticJson<OverviewResponse>('overview.json'),
  getTimeline: () => readStaticJson<EventItem[]>('timeline.json'),
  getLabs: () => readStaticJson<LabItem[]>('labs.json'),
  getMedications: () => readStaticJson<MedicationsResponse>('medications.json'),
  getAdmissionPeriods: () => readStaticJson<AdmissionPeriodSummary[]>('admissions.json'),
  getAdmissionPeriodDetail: (periodId: number) =>
    readStaticJson<AdmissionPeriodDetail>(`admission-details/${periodId}.json`),
  getDocuments: () => readStaticJson<DocumentItem[]>('documents.json'),
  getDocumentDetail: (documentId: number) =>
    readStaticJson<DocumentDetail>(`document-details/${documentId}.json`),
  async search(keyword: string): Promise<SearchItem[]> {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return [];
    }

    const documents = await loadSearchIndex();

    return documents
      .filter(item =>
        `${item.title} ${item.relative_path} ${item.content_text}`.toLowerCase().includes(normalizedKeyword),
      )
      .slice(0, 20)
      .map(item => ({
        document_id: item.document_id,
        title: item.title,
        relative_path: item.relative_path,
        raw_url: item.raw_url,
        snippet: buildSearchSnippet(item.content_text, keyword),
      }));
  },
  getFiles: () => readStaticJson<FileItem[]>('files.json'),
  async reindex(): Promise<{ status: string }> {
    throw new Error('分享模式不支持在线刷新资料，请重新生成分享包。');
  },
};
