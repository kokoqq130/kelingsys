import { Button, Card, Empty, Input, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';
import type { FileItem } from '@/types/api';

const typeColorMap: Record<string, string> = {
  markdown: 'processing',
  image: 'success',
  pdf: 'warning',
  other: 'default',
};

const typeLabelMap: Record<string, string> = {
  markdown: '整理文档',
  image: '图片',
  pdf: 'PDF',
  other: '其他',
};

const FilesPage = () => {
  const [fileType, setFileType] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const deferredKeyword = useDeferredValue(keyword);
  const { data, error, loading } = useApiResource(medicalApi.getFiles, []);

  const filtered = useMemo(() => {
    const normalizedKeyword = deferredKeyword.trim().toLowerCase();
    return (data ?? []).filter(item => {
      const matchesType = fileType === 'all' ? true : item.file_type === fileType;
      const matchesKeyword =
        normalizedKeyword.length === 0
          ? true
          : item.relative_path.toLowerCase().includes(normalizedKeyword) ||
            item.file_name.toLowerCase().includes(normalizedKeyword);
      return matchesType && matchesKeyword;
    });
  }, [data, deferredKeyword, fileType]);

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>原始文件</Typography.Title>
        <Typography.Paragraph>
          这里可以直接查看原始图片、PDF 和整理文档，方便回到最初资料核对细节。
        </Typography.Paragraph>
      </div>
      <Card variant="borderless">
        {error ? <Empty description={error} /> : null}
        {!error ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="按文件名或路径筛选"
                style={{ width: 280 }}
              />
              <Segmented
                value={fileType}
                onChange={value => setFileType(String(value))}
                options={[
                  { label: '全部', value: 'all' },
                  { label: '整理文档', value: 'markdown' },
                  { label: '图片', value: 'image' },
                  { label: 'PDF', value: 'pdf' },
                ]}
              />
            </Space>
            <Table<FileItem>
              loading={loading}
              rowKey="id"
              scroll={{ x: 960 }}
              dataSource={filtered}
              columns={[
                {
                  title: '文件名',
                  dataIndex: 'file_name',
                  width: 220,
                },
                {
                  title: '类型',
                  dataIndex: 'file_type',
                  width: 110,
                  render: value => <Tag color={typeColorMap[value] || 'default'}>{typeLabelMap[value] || value}</Tag>,
                },
                {
                  title: '路径',
                  dataIndex: 'relative_path',
                },
                {
                  title: '更新时间',
                  dataIndex: 'updated_at',
                  width: 180,
                },
                {
                  title: '操作',
                  dataIndex: 'raw_url',
                  width: 100,
                  render: value =>
                    value ? (
                      <Button type="link" href={value} target="_blank">
                        打开
                      </Button>
                    ) : (
                      '-'
                    ),
                },
              ]}
            />
          </Space>
        ) : null}
      </Card>
    </Space>
  );
};

export default FilesPage;
