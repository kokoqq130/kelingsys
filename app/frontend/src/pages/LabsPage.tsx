import { Line } from '@ant-design/plots';
import { Button, Card, Empty, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';
import type { LabItem } from '@/types/api';

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

const LabsPage = () => {
  const { data, error, loading } = useApiResource(medicalApi.getLabs, []);
  const [selectedTest, setSelectedTest] = useState<string>('');

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

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>检查结果</Typography.Title>
        <Typography.Paragraph>
          当前先按结构化列表展示，下一轮再补趋势图和重点指标可视化。
        </Typography.Paragraph>
      </div>
      <Card bordered={false}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            指标趋势
          </Typography.Title>
          {numericGroups.length > 0 ? (
            <>
              <Segmented
                value={selectedTest}
                onChange={value => setSelectedTest(String(value))}
                options={numericGroups.map(group => ({ label: group.name, value: group.name }))}
              />
              <Line
                data={chartData}
                xField="date"
                yField="value"
                point
                height={280}
                color="#2e6a6a"
                axis={{ x: { title: false }, y: { title: false } }}
              />
            </>
          ) : (
            <Empty description="当前没有可绘制趋势的数值型数据" />
          )}
        </Space>
      </Card>
      <Card bordered={false}>
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
                width: 140,
                render: value => value || '-',
              },
              {
                title: '项目',
                dataIndex: 'test_name',
                width: 180,
              },
              {
                title: '分组',
                dataIndex: 'test_group',
                width: 120,
              },
              {
                title: '结果',
                dataIndex: 'result_text',
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: value => <Tag color={statusColor(value)}>{value}</Tag>,
              },
              {
                title: '原始文件',
                dataIndex: 'raw_url',
                width: 120,
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
        ) : null}
      </Card>
    </Space>
  );
};

export default LabsPage;
