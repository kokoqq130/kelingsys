import { liveMedicalApi } from '@/api/providers/live';
import { staticMedicalApi } from '@/api/providers/static';
import { dataSourceMode, isStaticDataSource } from '@/api/runtime';

export const medicalApi = isStaticDataSource ? staticMedicalApi : liveMedicalApi;

export const medicalApiCapabilities = {
  dataSourceMode,
  supportsReindex: !isStaticDataSource,
} as const;
