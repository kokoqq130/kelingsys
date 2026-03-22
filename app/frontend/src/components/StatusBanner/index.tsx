import { Alert, Button, Space } from 'antd';
import { useEffect, useState } from 'react';

import { apiGet } from '@/api/client';

interface HealthResponse {
  status: string;
  service: string;
  project_root: string;
}

const StatusBanner = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiGet<HealthResponse>('/api/health');
      setHealth(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHealth();
  }, []);

  if (loading) {
    return <Alert type="info" message="正在检查后端服务状态..." showIcon />;
  }

  if (error) {
    return (
      <Alert
        type="warning"
        showIcon
        message="后端服务尚未连通"
        description={
          <Space direction="vertical" size={8}>
            <span>{error}</span>
            <Button size="small" onClick={() => void loadHealth()}>
              重新检查
            </Button>
          </Space>
        }
      />
    );
  }

  return (
    <Alert
      type="success"
      showIcon
      message="后端基础服务已连通"
      description={`${health?.service} · 项目根目录：${health?.project_root}`}
    />
  );
};

export default StatusBanner;
