import { Card, Empty, Segmented, Space, Tag, Timeline, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';

const eventTypeMap: Record<string, { label: string; color: string }> = {
  seizure: { label: '发作', color: 'red' },
  admission: { label: '住院', color: 'blue' },
  medication_adjustment: { label: '调药', color: 'gold' },
  lab: { label: '检查', color: 'green' },
};

const TimelinePage = () => {
  const [filter, setFilter] = useState<string>('all');
  const { data, error, loading } = useApiResource(medicalApi.getTimeline, []);

  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }
    return filter === 'all' ? data : data.filter(item => item.event_type === filter);
  }, [data, filter]);

  if (loading) {
    return <Card bordered={false}>正在加载时间线...</Card>;
  }

  if (error || !data) {
    return (
      <Card bordered={false}>
        <Empty description={error || '暂时没有时间线数据'} />
      </Card>
    );
  }

  return (
    <Card bordered={false}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={3}>时间线</Typography.Title>
          <Typography.Paragraph>
            已按发作和住院事件接入真实数据，后续会继续补调药和更多检查节点。
          </Typography.Paragraph>
        </div>
        <Segmented
          value={filter}
          onChange={value => setFilter(String(value))}
          options={[
            { label: '全部', value: 'all' },
            { label: '发作', value: 'seizure' },
            { label: '住院', value: 'admission' },
          ]}
        />
        <Timeline
          items={filteredItems.map(item => ({
            color: eventTypeMap[item.event_type]?.color || 'gray',
            children: (
              <Space direction="vertical" size={6}>
                <Space wrap>
                  <Typography.Text strong>{item.event_date_text || item.event_date}</Typography.Text>
                  <Tag color={eventTypeMap[item.event_type]?.color || 'default'}>
                    {eventTypeMap[item.event_type]?.label || item.event_type}
                  </Tag>
                  {item.is_hospitalized ? <Tag color="purple">住院相关</Tag> : null}
                </Space>
                <Typography.Text>{item.summary}</Typography.Text>
                <Typography.Text type="secondary">{item.detail_text}</Typography.Text>
              </Space>
            ),
          }))}
        />
      </Space>
    </Card>
  );
};

export default TimelinePage;
