import { Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd';

import StatusBanner from '@/components/StatusBanner';

const milestones = [
  '主文档与住院文档作为第一事实来源',
  '后端负责扫描、解析、索引与查询',
  '前端优先承接总览、时间线、搜索和文档预览',
];

const OverviewPage = () => (
  <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <StatusBanner />
    <Row gutter={[20, 20]}>
      <Col xs={24} xl={15}>
        <Card bordered={false}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Typography.Text style={{ color: '#b45c2f', letterSpacing: 2 }}>
                SYSTEM OVERVIEW
              </Typography.Text>
              <Typography.Title level={2} style={{ marginTop: 8 }}>
                先把真实资料接成一套可查询的网站
              </Typography.Title>
              <Typography.Paragraph style={{ fontSize: 16, marginBottom: 0 }}>
                这套界面会围绕当前项目内的 Markdown、报告图片和 PDF 建索引，不改变你继续通过 AI
                对话整理资料的方式。
              </Typography.Paragraph>
            </div>
            <List
              dataSource={milestones}
              renderItem={item => (
                <List.Item style={{ paddingInline: 0 }}>
                  <Tag color="processing">阶段</Tag>
                  <Typography.Text>{item}</Typography.Text>
                </List.Item>
              )}
            />
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={9}>
        <Row gutter={[20, 20]}>
          <Col span={12}>
            <Card bordered={false}>
              <Statistic title="资料来源" value="Markdown / 图片 / PDF" />
            </Card>
          </Col>
          <Col span={12}>
            <Card bordered={false}>
              <Statistic title="当前阶段" value="模块 1" />
            </Card>
          </Col>
          <Col span={24}>
            <Card bordered={false}>
              <Typography.Title level={5}>这一轮先完成</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                前后端目录、主题、路由、后端健康接口和基础页面骨架。
              </Typography.Paragraph>
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  </Space>
);

export default OverviewPage;
