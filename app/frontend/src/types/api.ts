export interface HealthResponse {
  status: string;
  service: string;
  project_root: string;
  indexed_at: string;
}

export interface DiagnosisItem {
  name: string;
  diagnosed_at?: string;
}

export interface MedicationItem {
  id?: number;
  document_id?: number;
  name: string;
  category: string;
  dose_text: string;
  route?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  note?: string | null;
  raw_url?: string | null;
}

export interface EventItem {
  id: number;
  admission_period_id?: number | null;
  source_document_id: number;
  event_date: string;
  event_date_text: string;
  event_time_text?: string | null;
  event_type: string;
  title: string;
  summary: string;
  detail_text: string;
  is_hospitalized: number;
  admission_period_text?: string | null;
  admission_status?: string | null;
  relative_path: string;
  raw_url?: string | null;
}

export interface LabItem {
  id: number;
  source_document_id?: number;
  result_date: string;
  result_date_text: string;
  test_group: string;
  panel_name: string;
  test_name: string;
  result_text: string;
  numeric_value?: number | null;
  unit?: string | null;
  status: string;
  is_approximate: number;
  relative_path: string;
  raw_url?: string | null;
}

export interface DocumentItem {
  id: number;
  doc_kind: string;
  title: string;
  relative_path: string;
  raw_url?: string | null;
}

export interface FileItem {
  id: number;
  relative_path: string;
  file_name: string;
  file_type: string;
  updated_at: string;
  raw_url?: string | null;
}

export interface DocumentDetail extends DocumentItem {
  content_text: string;
  related_files: Array<{
    relative_path: string;
    relation_type: string;
    raw_url?: string | null;
  }>;
}

export interface SearchItem {
  document_id: number;
  title: string;
  relative_path: string;
  snippet: string;
  raw_url?: string | null;
}

export interface SearchIndexItem {
  document_id: number;
  title: string;
  relative_path: string;
  raw_url?: string | null;
  content_text: string;
}

export interface CountStatItem {
  event_type?: string;
  file_type?: string;
  doc_kind?: string;
  count: number;
}

export interface AbnormalLabItem {
  result_date: string;
  result_date_text: string;
  test_name: string;
  result_text: string;
  status: string;
}

export interface AdmissionPeriodSummary {
  id: number;
  title: string;
  folder_path: string;
  admission_date?: string | null;
  admission_date_text?: string | null;
  discharge_date?: string | null;
  discharge_date_text?: string | null;
  period_text: string;
  status?: string | null;
  summary: string;
  admission_reason?: string | null;
  main_event?: string | null;
  treatment?: string | null;
  symptoms?: string | null;
  medication_change?: string | null;
  discharge_summary?: string | null;
  detail_text: string;
  source_document_id: number;
}

export interface AdmissionPeriodDetail {
  period: AdmissionPeriodSummary;
  events: EventItem[];
  labs: LabItem[];
  documents: DocumentItem[];
  raw_files: FileItem[];
}

export interface MedicationAdjustmentItem {
  id: number;
  document_id: number;
  event_date: string;
  event_date_text: string;
  summary: string;
  detail_text: string;
  relative_path: string;
  raw_url?: string | null;
}

export interface OverviewResponse {
  patient: Record<string, string>;
  main_issue: string;
  current_status: string;
  diagnoses: DiagnosisItem[];
  highlights: string[];
  current_medications: MedicationItem[];
  latest_seizure?: {
    event_date: string;
    event_date_text: string;
    summary: string;
  } | null;
  latest_admission?: AdmissionPeriodSummary | null;
  stats: {
    file_count: number;
    document_count: number;
    event_count: number;
    lab_count: number;
  };
  event_type_stats: CountStatItem[];
  file_type_stats: CountStatItem[];
  document_kind_stats: CountStatItem[];
  abnormal_labs: AbnormalLabItem[];
}

export interface MedicationsResponse {
  current: MedicationItem[];
  adjustments: MedicationAdjustmentItem[];
}
