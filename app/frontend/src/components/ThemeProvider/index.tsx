import { ConfigProvider, theme } from 'antd';
import { PropsWithChildren } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

import { GlobalStyles } from '@/styles/globalStyles';
import { appTheme, customColors } from '@/styles/theme';

const ThemeProvider = ({ children }: PropsWithChildren) => (
  <ConfigProvider
    theme={{
      algorithm: theme.defaultAlgorithm,
      cssVar: true,
      hashed: false,
      ...appTheme,
    }}
  >
    <StyledThemeProvider theme={{ customColors }}>
      <GlobalStyles customColors={customColors} />
      {children}
    </StyledThemeProvider>
  </ConfigProvider>
);

export default ThemeProvider;
