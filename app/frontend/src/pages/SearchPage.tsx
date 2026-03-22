import { Card, Empty, Input, Space, Typography } from 'antd';

const SearchPage = () => (
  <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <div>
      <Typography.Title level={3}>搜索</Typography.Title>
      <Typography.Paragraph>
        这一页会承接全文搜索、事件筛选和结果跳转。当前先把交互入口和布局骨架放好。
      </Typography.Paragraph>
    </div>
    <Card bordered={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Input.Search placeholder="例如：呕吐、地西泮、住院、同型半胱氨酸" enterButton="搜索" />
        <Empty description="等待全文索引接入" />
      </Space>
    </Card>
  </Space>
);

export default SearchPage;
