import { Alert, Button, Space } from 'antd';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';

const StatusBanner = () => {
  const { data: health, error, loading, reload } = useApiResource(medicalApi.getHealth, []);

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
            <Button size="small" onClick={() => void reload()}>
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
      description={`${health?.service} · 索引时间：${health?.indexed_at || '未记录'}`}
    />
  );
};

export default StatusBanner;
