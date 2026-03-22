import { apiGet, apiPost } from '@/api/client';
import type {
  DocumentDetail,
  DocumentItem,
  EventItem,
  HealthResponse,
  LabItem,
  OverviewResponse,
  SearchItem,
} from '@/types/api';

export const medicalApi = {
  getHealth: () => apiGet<HealthResponse>('/api/health'),
  getOverview: () => apiGet<OverviewResponse>('/api/overview'),
  getTimeline: () => apiGet<EventItem[]>('/api/timeline'),
  getLabs: () => apiGet<LabItem[]>('/api/labs'),
  getDocuments: () => apiGet<DocumentItem[]>('/api/documents'),
  getDocumentDetail: (documentId: number) => apiGet<DocumentDetail>(`/api/documents/${documentId}`),
  search: (keyword: string) => apiGet<SearchItem[]>(`/api/search?q=${encodeURIComponent(keyword)}`),
  reindex: () => apiPost<{ status: string }>('/api/reindex'),
};
