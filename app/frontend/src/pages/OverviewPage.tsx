import { App, Button, Card, Col, Descriptions, Empty, List, Row, Space, Statistic, Tag, Typography } from 'antd';

import { medicalApi } from '@/api/medical';
import StatusBanner from '@/components/StatusBanner';
import { useApiResource } from '@/hooks/useApiResource';

const OverviewPage = () => {
  const { message } = App.useApp();
  const { data, error, loading, reload } = useApiResource(medicalApi.getOverview, []);

  const handleReindex = async () => {
    await medicalApi.reindex();
    message.success('索引已重建');
    await reload();
  };

  if (loading) {
    return <StatusBanner />;
  }

  if (error || !data) {
    return (
      <Card bordered={false}>
        <Empty description={error || '暂时没有读取到总览数据'} />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <StatusBanner />
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card
            bordered={false}
            extra={
              <Button onClick={() => void handleReindex()}>
                重建索引
              </Button>
            }
          >
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <div>
                <Typography.Text style={{ color: '#b45c2f', letterSpacing: 2 }}>
                  PATIENT OVERVIEW
                </Typography.Text>
                <Typography.Title level={2} style={{ marginTop: 8, marginBottom: 10 }}>
                  {data.patient['姓名']} 的资料总览
                </Typography.Title>
                <Typography.Paragraph style={{ fontSize: 16, marginBottom: 0 }}>
                  {data.current_status}
                </Typography.Paragraph>
              </div>
              <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
                {Object.entries(data.patient).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
              <div>
                <Typography.Title level={5}>主要问题</Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 0 }}>{data.main_issue}</Typography.Paragraph>
              </div>
              <div>
                <Typography.Title level={5}>主要诊断</Typography.Title>
                <Space wrap>
                  {data.diagnoses.map(item => (
                    <Tag key={item.name} color="processing">
                      {item.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Row gutter={[20, 20]}>
            <Col span={12}>
              <Card bordered={false}>
                <Statistic title="文件总数" value={data.stats.file_count} />
              </Card>
            </Col>
            <Col span={12}>
              <Card bordered={false}>
                <Statistic title="事件总数" value={data.stats.event_count} />
              </Card>
            </Col>
            <Col span={12}>
              <Card bordered={false}>
                <Statistic title="文档总数" value={data.stats.document_count} />
              </Card>
            </Col>
            <Col span={12}>
              <Card bordered={false}>
                <Statistic title="检查记录" value={data.stats.lab_count} />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card bordered={false} title="当前用药">
            <List
              dataSource={data.current_medications}
              renderItem={item => (
                <List.Item>
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
        <Col xs={24} xl={12}>
          <Card bordered={false} title="近期提醒">
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>最近一次发作</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {data.latest_seizure?.summary || '暂无'}
                </Typography.Paragraph>
              </div>
              <div>
                <Typography.Text strong>最近一次住院</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {data.latest_admission?.summary || '暂无'}
                </Typography.Paragraph>
              </div>
              <div>
                <Typography.Text strong>长期重点</Typography.Text>
                <List
                  size="small"
                  dataSource={data.highlights}
                  renderItem={item => <List.Item style={{ paddingInline: 0 }}>{item}</List.Item>}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default OverviewPage;
