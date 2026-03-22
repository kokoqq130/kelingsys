import { Button, Card, Empty, Input, List, Space, Tree, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';
import type { DocumentDetail, DocumentItem } from '@/types/api';
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

const kindLabelMap: Record<string, string> = {
  main_summary: '主文档',
  admission_note: '住院整理',
  report_index: '报告索引',
  other: '其他文档',
};

const DocumentsPage = () => {
  const { data: documents, error, loading } = useApiResource(medicalApi.getDocuments, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const queryDocumentId = searchParams.get('documentId');
    if (queryDocumentId) {
      const nextId = Number(queryDocumentId);
      if (!Number.isNaN(nextId) && nextId !== selectedDocumentId) {
        setSelectedDocumentId(nextId);
      }
      return;
    }

    if (!documents?.length || selectedDocumentId) {
      return;
    }
    setSelectedDocumentId(documents[0].id);
  }, [documents, searchParams, selectedDocumentId]);

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

  const treeData = useMemo(() => {
    const keywordText = keyword.trim();
    const grouped = new Map<string, DocumentItem[]>();

    for (const document of documents ?? []) {
      const matchesKeyword =
        keywordText.length === 0
          ? true
          : `${document.title} ${document.relative_path}`.includes(keywordText);
      if (!matchesKeyword) {
        continue;
      }
      const bucket = grouped.get(document.doc_kind) ?? [];
      bucket.push(document);
      grouped.set(document.doc_kind, bucket);
    }

    return Array.from(grouped.entries()).map(([kind, items]) => ({
      key: `kind-${kind}`,
      title: `${kindLabelMap[kind] || kind} (${items.length})`,
      selectable: false,
      children: items.map(item => ({
        key: String(item.id),
        title: item.title,
      })),
    }));
  }, [documents, keyword]);

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
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="筛选文档标题或路径"
              />
              <Tree
                treeData={treeData}
                selectedKeys={selectedDocumentId ? [String(selectedDocumentId)] : []}
                onSelect={keys => {
                  const nextKey = keys[0];
                  if (nextKey) {
                    const nextId = Number(nextKey);
                    setSelectedDocumentId(nextId);
                    setSearchParams({ documentId: String(nextId) });
                  }
                }}
                defaultExpandAll
              />
            </Space>
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
