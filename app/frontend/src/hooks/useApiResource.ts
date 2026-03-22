import { DependencyList, useEffect, useState } from 'react';

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useApiResource<T>(
  loader: () => Promise<T>,
  dependencies: DependencyList = [],
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      setData(nextData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, dependencies);

  return { data, error, loading, reload };
}
