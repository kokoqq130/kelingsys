export type DataSourceMode = 'api' | 'static';
export type RouterMode = 'browser' | 'hash';

export const dataSourceMode: DataSourceMode =
  import.meta.env.VITE_DATA_SOURCE === 'static' ? 'static' : 'api';

export const isStaticDataSource = dataSourceMode === 'static';

export const routerMode: RouterMode =
  import.meta.env.VITE_ROUTER_MODE === 'hash' || isStaticDataSource ? 'hash' : 'browser';
