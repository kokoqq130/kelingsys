import { Button, Card, Empty, List, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';
import type { DocumentDetail } from '@/types/api';
import { rewriteMarkdownLinks } from '@/utils/markdown';

const DocumentLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 20px;
  width: 100%;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const DocumentsPage = () => {
  const { data: documents, error, loading } = useApiResource(medicalApi.getDocuments, []);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!documents?.length || selectedDocumentId) {
      return;
    }
    setSelectedDocumentId(documents[0].id);
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    setDetailLoading(true);
    medicalApi
      .getDocumentDetail(selectedDocumentId)
      .then(nextDetail => setDetail(nextDetail))
      .finally(() => setDetailLoading(false));
  }, [selectedDocumentId]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>文档资料</Typography.Title>
        <Typography.Paragraph>
          当前已接入主文档和住院整理文档预览，并支持跳转到原始图片和 PDF。
        </Typography.Paragraph>
      </div>
      <DocumentLayout>
        <Card bordered={false} loading={loading} style={{ minHeight: 640 }}>
          {error ? <Empty description={error} /> : null}
          {!error ? (
            <List
              dataSource={documents ?? []}
              renderItem={item => (
                <List.Item
                  onClick={() => setSelectedDocumentId(item.id)}
                  style={{
                    cursor: 'pointer',
                    paddingInline: 8,
                    borderRadius: 12,
                    background: item.id === selectedDocumentId ? 'rgba(46,106,106,0.08)' : 'transparent',
                  }}
                >
                  <List.Item.Meta title={item.title} description={item.relative_path} />
                </List.Item>
              )}
            />
          ) : null}
        </Card>
        <Card bordered={false} loading={detailLoading} style={{ minHeight: 640 }}>
          {detail ? (
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <Space wrap>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {detail.title}
                </Typography.Title>
                {detail.raw_url ? (
                  <Button type="link" href={detail.raw_url} target="_blank">
                    打开原始文档
                  </Button>
                ) : null}
              </Space>
              <XMarkdown content={rewriteMarkdownLinks(detail.content_text, detail.relative_path)} />
              <div>
                <Typography.Title level={5}>关联原始文件</Typography.Title>
                <List
                  size="small"
                  dataSource={detail.related_files}
                  locale={{ emptyText: '当前文档没有关联文件' }}
                  renderItem={item => (
                    <List.Item>
                      <Space wrap>
                        <Typography.Text>{item.relative_path}</Typography.Text>
                        {item.raw_url ? (
                          <Button type="link" href={item.raw_url} target="_blank">
                            打开
                          </Button>
                        ) : null}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            </Space>
          ) : (
            <Empty description="请选择左侧文档" />
          )}
        </Card>
      </DocumentLayout>
    </Space>
  );
};

export default DocumentsPage;
