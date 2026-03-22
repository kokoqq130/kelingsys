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
  source_document_id: number;
  event_date: string;
  event_date_text: string;
  event_time_text?: string | null;
  event_type: string;
  title: string;
  summary: string;
  detail_text: string;
  is_hospitalized: number;
  relative_path: string;
  raw_url?: string | null;
}

export interface LabItem {
  id: number;
  result_date: string;
  result_date_text: string;
  test_group: string;
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
  latest_admission?: {
    event_date: string;
    event_date_text: string;
    summary: string;
  } | null;
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
