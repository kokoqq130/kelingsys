import {
  FileProtectOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PictureOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import { XMarkdown } from '@ant-design/x-markdown';
import { Button, Card, Collapse, Empty, Grid, Input, List, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import { useApiResource } from '@/hooks/useApiResource';
import type { DocumentDetail, DocumentItem } from '@/types/api';
import { inferPreviewFileType, resolvePreviewTitle } from '@/utils/filePreview';
import { rewriteMarkdownLinks } from '@/utils/markdown';

const DocumentLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  width: 100%;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const SidebarStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const PriorityCard = styled.div<{ $active: boolean }>`
  padding: 16px;
  border: 1px solid ${props => (props.$active ? 'rgba(34, 197, 94, 0.88)' : 'rgba(187, 247, 208, 0.82)')};
  border-radius: 18px;
  background: ${props =>
    props.$active
      ? 'linear-gradient(180deg, rgba(220, 252, 231, 0.92), rgba(187, 247, 208, 0.78))'
      : 'rgba(255, 255, 255, 0.76)'};
  box-shadow: ${props =>
    props.$active ? '0 18px 40px -32px rgba(34, 197, 94, 0.65)' : 'none'};

  @media (max-width: 768px) {
    padding: 14px;
    border-radius: 16px;
  }
`;

const DocButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid ${props => (props.$active ? 'rgba(34, 197, 94, 0.88)' : 'rgba(187, 247, 208, 0.7)')};
  border-radius: 16px;
  color: inherit;
  text-align: left;
  background: ${props =>
    props.$active
      ? 'linear-gradient(180deg, rgba(220, 252, 231, 0.9), rgba(187, 247, 208, 0.75))'
      : 'rgba(255, 255, 255, 0.72)'};
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    border-color: rgba(34, 197, 94, 0.88);
    background: rgba(240, 253, 244, 0.94);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 12px 14px;
    border-radius: 14px;
  }
`;

const DocGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PreviewMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
`;

const DetailCard = styled(Card)`
  height: 100%;

  .ant-card-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .ant-card-body {
      gap: 16px;
    }
  }
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const DetailMeta = styled.div`
  min-width: 0;
  flex: 1;
`;

const DetailActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const MarkdownPanel = styled.div`
  min-width: 0;
`;

const { useBreakpoint } = Grid;

const kindLabelMap: Record<string, string> = {
  main_summary: '主文档',
  admission_note: '住院周期整理',
  discharge_summary: '出院小结',
  report_index: '报告目录',
  other: '其他文档',
};

const groupOrder = ['admission_note', 'discharge_summary', 'report_index', 'other'];

function resolveGroupIcon(kind: string) {
  if (kind === 'admission_note' || kind === 'discharge_summary') {
    return <FileProtectOutlined />;
  }
  if (kind === 'report_index') {
    return <FolderOpenOutlined />;
  }
  return <FileTextOutlined />;
}

const DocumentsPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data: documents, error, loading } = useApiResource(medicalApi.getDocuments, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const mainDocument = useMemo(
    () => (documents ?? []).find(item => item.doc_kind === 'main_summary') ?? null,
    [documents],
  );

  useEffect(() => {
    const queryDocumentId = searchParams.get('documentId');
    if (queryDocumentId) {
      const nextId = Number(queryDocumentId);
      if (!Number.isNaN(nextId) && nextId !== selectedDocumentId) {
        setSelectedDocumentId(nextId);
      }
      return;
    }

    if (selectedDocumentId) {
      return;
    }

    if (mainDocument) {
      setSelectedDocumentId(mainDocument.id);
      return;
    }

    if (documents?.length) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, mainDocument, searchParams, selectedDocumentId]);

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

  const keywordText = keyword.trim();

  const groupedDocuments = useMemo(() => {
    const filtered = (documents ?? []).filter(document => {
      if (!keywordText) {
        return true;
      }
      return `${document.title} ${document.relative_path}`.includes(keywordText);
    });

    const groups = new Map<string, DocumentItem[]>();

    for (const item of filtered) {
      if (item.doc_kind === 'main_summary') {
        continue;
      }

      const bucket = groups.get(item.doc_kind) ?? [];
      bucket.push(item);
      groups.set(item.doc_kind, bucket);
    }

    return groupOrder
      .map(kind => ({
        kind,
        items: groups.get(kind) ?? [],
      }))
      .filter(group => group.items.length > 0);
  }, [documents, keywordText]);

  const openDocument = (documentId: number) => {
    setSelectedDocumentId(documentId);
    setSearchParams({ documentId: String(documentId) });
  };

  const openPreview = (target: FilePreviewTarget) => {
    setPreviewTarget(target);
  };

  const priorityDescription =
    mainDocument?.title === detail?.title
      ? '当前正在查看主文档，适合优先提供给医生快速了解整体情况。'
      : '医生沟通时建议先看这份主文档，再补充住院周期资料和原始资料。';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={isMobile ? 4 : 3}>文档资料</Typography.Title>
        <Typography.Paragraph>
          主文档放在最前面，便于先看整体情况；其他住院周期资料和报告目录放在后面，按需要继续展开查看。
        </Typography.Paragraph>
      </div>

      <DocumentLayout>
        <SidebarStack>
          <Card
            variant="borderless"
            loading={loading}
            styles={{ body: { padding: isMobile ? 16 : 20 } }}
          >
            {error ? <Empty description={error} /> : null}
            {!error ? (
              <SidebarStack>
                <Input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  placeholder="筛选文档标题或路径"
                />

                {mainDocument ? (
                  <PriorityCard $active={selectedDocumentId === mainDocument.id}>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <PreviewMeta>
                        <Tag color="success" icon={<PushpinOutlined />}>
                          优先查看
                        </Tag>
                        <Tag>主文档</Tag>
                      </PreviewMeta>

                      <div>
                        <Typography.Title level={5} style={{ margin: 0 }}>
                          {mainDocument.title}
                        </Typography.Title>
                        <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                          {priorityDescription}
                        </Typography.Paragraph>
                      </div>

                      <Button type="primary" onClick={() => openDocument(mainDocument.id)}>
                        {isMobile ? '打开主文档' : '查看主文档'}
                      </Button>
                    </Space>
                  </PriorityCard>
                ) : null}

                <div>
                  <Typography.Text strong>其他资料</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>
                    住院周期整理、出院小结和报告目录放在这里，按分类展开即可。
                  </Typography.Paragraph>
                </div>

                {groupedDocuments.length > 0 ? (
                  <Collapse
                    ghost
                    size={isMobile ? 'small' : 'middle'}
                    defaultActiveKey={groupedDocuments.map(group => group.kind)}
                    items={groupedDocuments.map(group => ({
                      key: group.kind,
                      label: (
                        <Space size={10}>
                          {resolveGroupIcon(group.kind)}
                          <span>{kindLabelMap[group.kind] || group.kind}</span>
                          <Tag>{group.items.length}</Tag>
                        </Space>
                      ),
                      children: (
                        <DocGroupList>
                          {group.items.map(item => (
                            <DocButton
                              key={item.id}
                              type="button"
                              $active={selectedDocumentId === item.id}
                              onClick={() => openDocument(item.id)}
                            >
                              <Typography.Text strong>{item.title}</Typography.Text>
                              <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                                {item.relative_path}
                              </Typography.Paragraph>
                            </DocButton>
                          ))}
                        </DocGroupList>
                      ),
                    }))}
                  />
                ) : (
                  <Empty description="当前筛选条件下没有其他文档" />
                )}
              </SidebarStack>
            ) : null}
          </Card>
        </SidebarStack>

        <DetailCard
          variant="borderless"
          loading={detailLoading}
          style={{ minHeight: isMobile ? undefined : 640 }}
          styles={{ body: { padding: isMobile ? 16 : 24 } }}
        >
          {detail ? (
            <>
              <DetailHeader>
                <DetailMeta>
                  <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                    {detail.title}
                  </Typography.Title>
                  <PreviewMeta style={{ marginTop: 10 }}>
                    <Tag color={detail.doc_kind === 'main_summary' ? 'success' : 'processing'}>
                      {kindLabelMap[detail.doc_kind] || detail.doc_kind}
                    </Tag>
                    <Typography.Text type="secondary">{detail.relative_path}</Typography.Text>
                  </PreviewMeta>
                </DetailMeta>

                <DetailActions>
                  <Button
                    block={isMobile}
                    onClick={() =>
                      openPreview({
                        title: detail.title,
                        relativePath: detail.relative_path,
                        rawUrl: detail.raw_url,
                        fileType: 'markdown',
                        markdownContent: detail.content_text,
                      })
                    }
                  >
                    侧边预览
                  </Button>
                </DetailActions>
              </DetailHeader>

              <MarkdownPanel>
                <XMarkdown content={rewriteMarkdownLinks(detail.content_text, detail.relative_path)} />
              </MarkdownPanel>

              <div>
                <Typography.Title level={5}>关联原始资料</Typography.Title>
                <List
                  size="small"
                  dataSource={detail.related_files}
                  locale={{ emptyText: '当前文档没有关联文件' }}
                  renderItem={item => {
                    const previewType = inferPreviewFileType(item.relative_path);

                    return (
                      <List.Item>
                        <Space
                          wrap
                          size={10}
                          style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                          <Space wrap size={10}>
                            {previewType === 'image' ? <PictureOutlined /> : <FileTextOutlined />}
                            <Typography.Text>{item.relative_path}</Typography.Text>
                          </Space>

                          <Space wrap size={4}>
                            {item.raw_url ? (
                              <Button
                                type="link"
                                onClick={() =>
                                  openPreview({
                                    title: resolvePreviewTitle(item.relative_path),
                                    relativePath: item.relative_path,
                                    rawUrl: item.raw_url,
                                    fileType: previewType,
                                  })
                                }
                              >
                                预览
                              </Button>
                            ) : null}
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </div>
            </>
          ) : (
            <Empty description="请选择左侧文档" />
          )}
        </DetailCard>
      </DocumentLayout>

      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </Space>
  );
};

export default DocumentsPage;
