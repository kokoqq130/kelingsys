import { createGlobalStyle } from 'styled-components';

interface GlobalStylesProps {
  customColors: Record<string, string>;
}

export const GlobalStyles = createGlobalStyle<GlobalStylesProps>`
  :root {
    ${props =>
      Object.entries(props.customColors)
        .map(([key, value]) => `--custom-${key}: ${value};`)
        .join('\n')}
  }

  html,
  body,
  #root {
    margin: 0;
    min-height: 100%;
  }

  body {
    background: #eef4ef;
    color: #13263d;
    font-family:
      'Segoe UI',
      'PingFang SC',
      'Hiragino Sans GB',
      'Microsoft YaHei',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(19, 38, 61, 0.18);
    border-radius: 999px;
  }

  ::selection {
    background: rgba(41, 110, 255, 0.18);
  }
`;
