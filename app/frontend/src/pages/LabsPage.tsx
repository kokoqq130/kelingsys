import { Card, Col, Empty, Row, Space, Typography } from 'antd';

const LabsPage = () => (
  <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <div>
      <Typography.Title level={3}>检查结果</Typography.Title>
      <Typography.Paragraph>
        后续会按“同型半胱氨酸、吡仑帕奈血药浓度、血氨、乳酸”等重点项目聚合浏览。
      </Typography.Paragraph>
    </div>
    <Row gutter={[20, 20]}>
      <Col xs={24} lg={12}>
        <Card bordered={false} title="重点指标列表">
          <Empty description="等待后端索引完成后填充" />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card bordered={false} title="趋势图区域">
          <Empty description="后续使用 @ant-design/plots 接入" />
        </Card>
      </Col>
    </Row>
  </Space>
);

export default LabsPage;
