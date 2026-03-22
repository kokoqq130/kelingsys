import type { ThemeConfig } from 'antd';

import { customColors } from '@/styles/theme/customColors';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2e6a6a',
    colorInfo: '#2e6a6a',
    colorSuccess: '#3a7f52',
    colorWarning: '#b45c2f',
    colorError: '#c44536',
    colorBgLayout: '#eef4ef',
    colorBgContainer: '#ffffff',
    colorText: customColors.ink,
    colorTextSecondary: customColors.inkSoft,
    borderRadius: 18,
    fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
};

export { customColors };
