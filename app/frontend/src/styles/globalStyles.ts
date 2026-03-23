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
    background:
      radial-gradient(circle at top left, rgba(74, 222, 128, 0.24), transparent 24%),
      radial-gradient(circle at 84% 12%, rgba(16, 185, 129, 0.18), transparent 18%),
      radial-gradient(circle at bottom right, rgba(187, 247, 208, 0.45), transparent 28%),
      linear-gradient(180deg, #f7fff8 0%, #ecfdf5 48%, #dcfce7 100%);
    color: var(--custom-ink);
    font-family:
      'Avenir Next',
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
    background: rgba(21, 128, 61, 0.22);
    border-radius: 999px;
  }

  ::selection {
    background: rgba(34, 197, 94, 0.22);
  }

  a {
    color: #15803d;
  }

  .ant-app,
  .ant-layout {
    min-height: 100vh;
    background: transparent;
  }

  .ant-card {
    background: rgba(255, 255, 255, 0.84);
    border: 1px solid var(--custom-border);
    box-shadow: 0 24px 48px -32px var(--custom-shadow);
    backdrop-filter: blur(18px);
  }

  .ant-card .ant-card-head {
    border-bottom-color: rgba(134, 239, 172, 0.58);
  }

  .ant-card .ant-card-head-title {
    color: var(--custom-ink);
    font-weight: 700;
  }

  .ant-layout-sider,
  .ant-drawer-content {
    background: rgba(255, 255, 255, 0.76);
    backdrop-filter: blur(18px);
  }

  .ant-menu {
    background: transparent !important;
    color: var(--custom-ink);
  }

  .ant-menu-item,
  .ant-menu-submenu-title {
    border-radius: 14px;
    margin-inline: 14px !important;
    width: calc(100% - 28px) !important;
  }

  .ant-menu-item:hover,
  .ant-menu-submenu-title:hover {
    color: var(--custom-accentStrong) !important;
    background: rgba(220, 252, 231, 0.7) !important;
  }

  .ant-menu-item-selected {
    color: var(--custom-ink) !important;
    font-weight: 700;
    background: linear-gradient(135deg, rgba(220, 252, 231, 0.95), rgba(187, 247, 208, 0.88)) !important;
    box-shadow: inset 0 0 0 1px rgba(134, 239, 172, 0.8);
  }

  .ant-btn-default,
  .ant-btn-color-default {
    border-color: var(--custom-border);
  }

  .ant-btn-link {
    padding-inline: 0;
  }

  .ant-input,
  .ant-input-affix-wrapper,
  .ant-input-search .ant-input-group-addon,
  .ant-select-selector {
    border-color: var(--custom-border) !important;
    box-shadow: none !important;
  }

  .ant-input:hover,
  .ant-input-affix-wrapper:hover,
  .ant-select-selector:hover {
    border-color: var(--custom-accent) !important;
  }

  .ant-input-search-button,
  .ant-btn-color-primary {
    box-shadow: 0 10px 24px -18px rgba(34, 197, 94, 0.55);
  }

  .ant-segmented {
    padding: 4px;
    background: rgba(220, 252, 231, 0.78);
    border: 1px solid rgba(134, 239, 172, 0.72);
  }

  .ant-segmented-item-selected {
    box-shadow: 0 10px 24px -20px rgba(34, 197, 94, 0.7) !important;
  }

  .ant-descriptions-bordered .ant-descriptions-item-label {
    background: rgba(236, 253, 245, 0.88);
  }

  .ant-table-wrapper .ant-table {
    background: rgba(255, 255, 255, 0.84);
  }

  .ant-table-wrapper .ant-table-thead > tr > th {
    background: rgba(236, 253, 245, 0.96) !important;
    color: var(--custom-ink);
    border-bottom-color: rgba(134, 239, 172, 0.5);
  }

  .ant-table-wrapper .ant-table-tbody > tr > td {
    border-bottom-color: rgba(187, 247, 208, 0.58);
  }

  .ant-table-wrapper .ant-table-tbody > tr:hover > td {
    background: rgba(220, 252, 231, 0.42) !important;
  }

  .ant-alert {
    border-radius: 16px;
    box-shadow: 0 18px 36px -30px var(--custom-shadow);
  }

  .ant-statistic {
    border-radius: 16px;
  }

  .ant-list .ant-list-item {
    border-block-end-color: rgba(187, 247, 208, 0.7);
  }

  .ant-tree {
    background: transparent;
  }

  mark {
    padding: 0 0.2em;
    color: var(--custom-ink);
    background: rgba(250, 204, 21, 0.28);
    border-radius: 6px;
  }

  .x-markdown {
    --text-color: rgba(6, 95, 70, 0.84);
    --font-size: 15px;
  }

  .x-markdown h1,
  .x-markdown h2,
  .x-markdown h3,
  .x-markdown h4 {
    color: var(--custom-ink);
    margin-top: 1.25em;
    margin-bottom: 0.55em;
  }

  .x-markdown blockquote {
    margin: 1.1em 0;
    padding: 14px 18px;
    color: var(--custom-inkSoft);
    background: rgba(240, 253, 244, 0.92);
    border-inline-start: 4px solid var(--custom-accent);
    border-radius: 14px;
  }

  .x-markdown code {
    color: #166534;
    background: rgba(220, 252, 231, 0.82);
  }

  .x-markdown pre {
    padding: 18px 20px;
    color: #ecfdf5;
    background: linear-gradient(180deg, #14532d 0%, #166534 100%);
    border-radius: 18px;
    box-shadow: 0 24px 40px -32px rgba(20, 83, 45, 0.9);
  }

  .x-markdown pre code {
    color: inherit;
    background: transparent;
  }

  .x-markdown table:not(pre) {
    border: 1px solid rgba(187, 247, 208, 0.88);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.88);
  }

  .x-markdown table:not(pre) th {
    background: rgba(236, 253, 245, 0.96);
  }

  .x-markdown img {
    border: 1px solid rgba(187, 247, 208, 0.82);
    border-radius: 18px;
    box-shadow: 0 24px 42px -34px var(--custom-shadow);
  }

  .x-markdown hr {
    border: none;
    border-top: 1px solid rgba(134, 239, 172, 0.7);
  }
`;
