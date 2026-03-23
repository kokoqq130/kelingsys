import { Line } from '@ant-design/plots';
import { Button, Card, Empty, Grid, Segmented, Select, Space, Table, Tag, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import { useApiResource } from '@/hooks/useApiResource';
import type { LabItem } from '@/types/api';
import { inferPreviewFileType, resolvePreviewTitle } from '@/utils/filePreview';

function statusColor(status: LabItem['status']): string {
  if (status === 'high') {
    return 'error';
  }
  if (status === 'low') {
    return 'warning';
  }
  if (status === 'normal') {
    return 'success';
  }
  return 'default';
}

function statusLabel(status: LabItem['status']): string {
  if (status === 'high') {
    return '偏高';
  }
  if (status === 'low') {
    return '偏低';
  }
  if (status === 'normal') {
    return '平稳';
  }
  return '待判断';
}

const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;

  @media (max-width: 768px) {
    gap: 16px;
  }
`;

const { useBreakpoint } = Grid;

const LabsPage = () => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data, error, loading } = useApiResource(medicalApi.getLabs, []);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const numericGroups = useMemo(() => {
    const groups = new Map<string, LabItem[]>();

    for (const item of data ?? []) {
      if (item.numeric_value == null) {
        continue;
      }
      const bucket = groups.get(item.test_name) ?? [];
      bucket.push(item);
      groups.set(item.test_name, bucket);
    }

    return Array.from(groups.entries())
      .map(([name, items]) => ({
        name,
        items: [...items].sort((left, right) => left.result_date.localeCompare(right.result_date)),
      }))
      .filter(group => group.items.length >= 1);
  }, [data]);

  useEffect(() => {
    if (!selectedTest && numericGroups.length > 0) {
      setSelectedTest(numericGroups[0].name);
    }
  }, [numericGroups, selectedTest]);

  const chartData = useMemo(() => {
    const currentGroup = numericGroups.find(item => item.name === selectedTest);
    return (currentGroup?.items ?? []).map(item => ({
      date: item.result_date_text || item.result_date,
      value: item.numeric_value ?? 0,
    }));
  }, [numericGroups, selectedTest]);

  const openPreview = (item: LabItem) => {
    if (!item.raw_url) {
      return;
    }

    setPreviewTarget({
      title: resolvePreviewTitle(item.relative_path, item.test_name),
      relativePath: item.relative_path,
      rawUrl: item.raw_url,
      fileType: inferPreviewFileType(item.relative_path),
      highlightLabel: item.test_name,
      highlightTerms: [item.test_name],
    });
  };

  return (
    <PageStack>
      <div>
        <Typography.Title level={isMobile ? 4 : 3}>检查结果</Typography.Title>
        <Typography.Paragraph>
          这里汇总近期整理出的检查结果，既能看列表，也能查看部分指标的变化趋势。
        </Typography.Paragraph>
      </div>
      <Card variant="borderless">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            指标趋势
          </Typography.Title>
          {numericGroups.length > 0 ? (
            <>
              {isMobile ? (
                <Select
                  value={selectedTest}
                  onChange={value => setSelectedTest(value)}
                  options={numericGroups.map(group => ({ label: group.name, value: group.name }))}
                  style={{ width: '100%' }}
                />
              ) : (
                <Segmented
                  value={selectedTest}
                  onChange={value => setSelectedTest(String(value))}
                  options={numericGroups.map(group => ({ label: group.name, value: group.name }))}
                />
              )}
              <Line
                data={chartData}
                xField="date"
                yField="value"
                point
                height={isMobile ? 220 : 280}
                color={token.colorPrimary}
                axis={{ x: { title: false }, y: { title: false } }}
              />
            </>
          ) : (
            <Empty description="当前没有可绘制趋势的数值型数据" />
          )}
        </Space>
      </Card>
      <Card variant="borderless">
        {error ? <Empty description={error} /> : null}
        {!error ? (
          <Table<LabItem>
            loading={loading}
            rowKey="id"
            scroll={{ x: 960 }}
            dataSource={data ?? []}
            locale={{ emptyText: '暂时没有检查结果' }}
            columns={[
              {
                title: '日期',
                dataIndex: 'result_date_text',
                width: isMobile ? 120 : 140,
                render: value => value || '-',
              },
              {
                title: '项目',
                dataIndex: 'test_name',
                width: isMobile ? 150 : 180,
              },
              {
                title: '分组',
                dataIndex: 'test_group',
                width: 120,
                responsive: ['md'],
              },
              {
                title: '结果',
                dataIndex: 'result_text',
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 92,
                render: value => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
              },
              {
                title: '预览',
                width: isMobile ? 88 : 120,
                render: (_, record) =>
                  record.raw_url ? (
                    <Button type="link" onClick={() => openPreview(record)}>
                      预览
                    </Button>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
        ) : null}
      </Card>
      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </PageStack>
  );
};

export default LabsPage;
