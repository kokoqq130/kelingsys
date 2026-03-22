import { Button, Card, Col, Empty, List, Row, Space, Tag, Timeline, Typography } from 'antd';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';

const MedicationsPage = () => {
  const { data, error, loading } = useApiResource(medicalApi.getMedications, []);

  if (error) {
    return (
      <Card bordered={false}>
        <Empty description={error} />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>用药变化</Typography.Title>
        <Typography.Paragraph>
          这一页同时展示当前用药和从主文档时间轴中抽出的调药记录，方便快速回答“什么时候加了什么药、减了什么药”。
        </Typography.Paragraph>
      </div>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={11}>
          <Card bordered={false} title="当前用药" loading={loading}>
            <List
              dataSource={data?.current ?? []}
              locale={{ emptyText: '暂无当前用药数据' }}
              renderItem={item => (
                <List.Item
                  actions={[
                    item.raw_url ? (
                      <Button key="open" type="link" href={item.raw_url} target="_blank">
                        来源
                      </Button>
                    ) : null,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <span>{item.name}</span>
                        <Tag>{item.category}</Tag>
                      </Space>
                    }
                    description={item.dose_text}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={13}>
          <Card bordered={false} title="调药时间轴" loading={loading}>
            <Timeline
              items={(data?.adjustments ?? []).map(item => ({
                color: 'gold',
                children: (
                  <Space direction="vertical" size={6}>
                    <Typography.Text strong>{item.event_date_text || item.event_date}</Typography.Text>
                    <Typography.Text>{item.summary}</Typography.Text>
                    <Typography.Text type="secondary">{item.detail_text}</Typography.Text>
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default MedicationsPage;
