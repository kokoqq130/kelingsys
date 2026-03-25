import { apiGet, apiPost } from '@/api/client';
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
} from '@/types/api';

export const liveMedicalApi = {
  getHealth: () => apiGet<HealthResponse>('/api/health'),
  getOverview: () => apiGet<OverviewResponse>('/api/overview'),
  getTimeline: () => apiGet<EventItem[]>('/api/timeline'),
  getLabs: () => apiGet<LabItem[]>('/api/labs'),
  getMedications: () => apiGet<MedicationsResponse>('/api/medications'),
  getAdmissionPeriods: () => apiGet<AdmissionPeriodSummary[]>('/api/admissions'),
  getAdmissionPeriodDetail: (periodId: number) =>
    apiGet<AdmissionPeriodDetail>(`/api/admissions/${periodId}`),
  getDocuments: () => apiGet<DocumentItem[]>('/api/documents'),
  getDocumentDetail: (documentId: number) => apiGet<DocumentDetail>(`/api/documents/${documentId}`),
  search: (keyword: string) => apiGet<SearchItem[]>(`/api/search?q=${encodeURIComponent(keyword)}`),
  getFiles: () => apiGet<FileItem[]>('/api/files'),
  reindex: () => apiPost<{ status: string }>('/api/reindex'),
};
