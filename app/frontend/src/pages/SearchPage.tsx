import { Button, Card, Empty, Input, List, Space, Typography } from 'antd';
import { useDeferredValue, useEffect, useState } from 'react';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import type { SearchItem } from '@/types/api';
import { buildPreviewHighlightTerms, inferPreviewFileType, resolvePreviewTitle } from '@/utils/filePreview';

const SearchPage = () => {
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
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>搜索</Typography.Title>
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
            enterButton="搜索"
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
                      <Space direction="vertical" size={6}>
                        <Typography.Text type="secondary">{item.relative_path}</Typography.Text>
                        <div dangerouslySetInnerHTML={{ __html: item.snippet }} />
                      </Space>
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
    </Space>
  );
};

export default SearchPage;
