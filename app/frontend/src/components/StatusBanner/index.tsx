import { Alert, Button, Space } from 'antd';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';

const StatusBanner = () => {
  const { data: health, error, loading, reload } = useApiResource(medicalApi.getHealth, []);

  if (loading) {
    return <Alert type="info" message="正在连接资料服务..." showIcon />;
  }

  if (error) {
    return (
      <Alert
        type="warning"
        showIcon
        message="暂时无法读取资料"
        description={
          <Space direction="vertical" size={8}>
            <span>{error}</span>
            <Button size="small" onClick={() => void reload()}>
              重新连接
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
      message="资料读取正常"
      description={`最近整理时间：${health?.indexed_at || '未记录'}`}
    />
  );
};

export default StatusBanner;
