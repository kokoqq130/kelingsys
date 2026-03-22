import { Card, Space, Typography } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';

const previewContent = `
# 文档预览占位

这里会接入主文档和住院文档的真实内容预览。

## 当前约定

- Markdown 展示默认使用 \`@ant-design/x-markdown\`
- 原始资料仍保留在项目目录中
- 后续支持从文档跳转到原图和 PDF
`;

const DocumentsPage = () => (
  <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <div>
      <Typography.Title level={3}>文档资料</Typography.Title>
      <Typography.Paragraph>
        先用 XMarkdown 打通渲染链路，下一轮再接入真实文件树和文档正文。
      </Typography.Paragraph>
    </div>
    <Card bordered={false}>
      <XMarkdown content={previewContent} />
    </Card>
  </Space>
);

export default DocumentsPage;
