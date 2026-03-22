import { Button, Card, Empty, Input, List, Space, Typography } from 'antd';
import { useDeferredValue, useEffect, useState } from 'react';

import { medicalApi } from '@/api/medical';
import type { SearchItem } from '@/types/api';

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>搜索</Typography.Title>
        <Typography.Paragraph>
          当前已接入全文搜索，中文关键词会先尝试 FTS，再自动回退到文本匹配。
        </Typography.Paragraph>
      </div>
      <Card bordered={false}>
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
                    item.raw_url ? (
                      <Button key="open" type="link" href={item.raw_url} target="_blank">
                        打开原文
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
    </Space>
  );
};

export default SearchPage;
