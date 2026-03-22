import { Card, Space, Timeline, Typography } from 'antd';

const items = [
  { color: 'red', children: '后续这里会展示发作、住院、调药、检查事件的统一时间线。' },
  { color: 'blue', children: '下一轮接入后端解析结果后，会按日期和事件类型自动生成。' },
];

const TimelinePage = () => (
  <Card bordered={false}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>时间线</Typography.Title>
        <Typography.Paragraph>
          当前是页面骨架。后续会接上“发作、住院、调药、检查”的统一时间线视图。
        </Typography.Paragraph>
      </div>
      <Timeline items={items} />
    </Space>
  </Card>
);

export default TimelinePage;
