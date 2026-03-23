import { Button, Card, Empty, Grid, Input, List, Space, Typography } from 'antd';
import { useDeferredValue, useEffect, useState } from 'react';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import type { SearchItem } from '@/types/api';
import { buildPreviewHighlightTerms, inferPreviewFileType, resolvePreviewTitle } from '@/utils/filePreview';

const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;

  @media (max-width: 768px) {
    gap: 16px;
  }
`;

const ResultMeta = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
`;

const ResultSnippet = styled.div`
  line-height: 1.72;
  color: rgba(6, 95, 70, 0.74);
  overflow-wrap: anywhere;
`;

const { useBreakpoint } = Grid;

const SearchPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);
  const deferredKeyword = useDeferredValue(keyword);

  useEffect(() => {
    if (!deferredKeyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    medicalApi
      .search(deferredKeyword)
      .then(nextResults => setResults(nextResults))
      .finally(() => setLoading(false));
  }, [deferredKeyword]);

  const openPreview = async (item: SearchItem) => {
    try {
      let relativePath = item.relative_path;
      let rawUrl = item.raw_url;
      let markdownContent: string | undefined;

      if (!rawUrl && item.document_id) {
        const detail = await medicalApi.getDocumentDetail(item.document_id);
        relativePath = detail.relative_path;
        rawUrl = detail.raw_url ?? undefined;
        markdownContent = detail.content_text;
      }

      setPreviewTarget({
        title: resolvePreviewTitle(relativePath, item.title),
        relativePath: relativePath,
        rawUrl,
        fileType: inferPreviewFileType(relativePath, rawUrl ? undefined : 'markdown'),
        markdownContent,
        highlightLabel: deferredKeyword.trim() || item.title,
        highlightTerms: buildPreviewHighlightTerms(deferredKeyword, item.title, item.snippet),
      });
    } catch {
      return;
    }
  };

  return (
    <PageStack>
      <div>
        <Typography.Title level={isMobile ? 4 : 3}>搜索</Typography.Title>
        <Typography.Paragraph>
          可以直接按症状、药名、检查项目或住院记录查找，适合快速定位相关资料。
        </Typography.Paragraph>
      </div>
      <Card variant="borderless">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input.Search
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="例如：呕吐、地西泮、住院、同型半胱氨酸"
            enterButton={isMobile ? '查找' : '搜索'}
          />
          {!keyword.trim() ? (
            <Empty description="输入关键词开始搜索" />
          ) : (
            <List
              loading={loading}
              dataSource={results}
              locale={{ emptyText: '没有找到匹配结果' }}
              renderItem={item => (
                <List.Item
                  actions={[
                    item.document_id || item.raw_url ? (
                      <Button key="preview" type="link" onClick={() => void openPreview(item)}>
                        预览文档
                      </Button>
                    ) : null,
                  ]}
                >
                <List.Item.Meta
                  title={item.title}
                  description={
                    <ResultMeta>
                      <Typography.Text type="secondary">{item.relative_path}</Typography.Text>
                      <ResultSnippet dangerouslySetInnerHTML={{ __html: item.snippet }} />
                    </ResultMeta>
                  }
                />
              </List.Item>
            )}
          />
          )}
        </Space>
      </Card>
      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </PageStack>
  );
};

export default SearchPage;
