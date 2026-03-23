import { Line } from '@ant-design/plots';
import { Button, Card, Empty, Grid, Select, Space, Table, Tag, Typography, theme } from 'antd';
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
    return '正常';
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

const ChartToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

type MetricSeries = {
  key: string;
  label: string;
  testName: string;
  unit: string;
  items: LabItem[];
};

type PanelSeries = {
  panelName: string;
  displayName: string;
  reportedCount: number | null;
  hasCountMismatch: boolean;
  metrics: MetricSeries[];
};

function parsePanelMeta(panelName: string, metricCount: number) {
  const match = panelName.match(/^(.*?)(?:\s*(\d+)\s*项)$/);
  if (!match) {
    return {
      displayName: panelName,
      reportedCount: null,
      hasCountMismatch: false,
    };
  }

  const displayName = match[1].trim() || panelName;
  const reportedCount = Number(match[2]);

  return {
    displayName,
    reportedCount,
    hasCountMismatch: Number.isFinite(reportedCount) && reportedCount !== metricCount,
  };
}

const { useBreakpoint } = Grid;

const LabsPage = () => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data, error, loading } = useApiResource(medicalApi.getLabs, []);
  const [selectedPanel, setSelectedPanel] = useState<string>('');
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const panelGroups = useMemo<PanelSeries[]>(() => {
    const panels = new Map<string, LabItem[]>();

    for (const item of data ?? []) {
      if (item.numeric_value == null) {
        continue;
      }

      const panelName = item.panel_name?.trim() || item.test_name;
      const bucket = panels.get(panelName) ?? [];
      bucket.push(item);
      panels.set(panelName, bucket);
    }

    return Array.from(panels.entries())
      .map(([panelName, items]) => {
        const metrics = new Map<string, MetricSeries>();

        for (const item of items) {
          const unit = item.unit?.trim() || '';
          const key = `${item.test_name}__${unit}`;
          const label = unit ? `${item.test_name} (${unit})` : item.test_name;
          const metric = metrics.get(key) ?? {
            key,
            label,
            testName: item.test_name,
            unit,
            items: [],
          };

          metric.items.push(item);
          metrics.set(key, metric);
        }

        return {
          panelName,
          ...parsePanelMeta(panelName, metrics.size),
          metrics: Array.from(metrics.values())
            .map(metric => ({
              ...metric,
              items: [...metric.items].sort((left, right) =>
                left.result_date === right.result_date ? left.id - right.id : left.result_date.localeCompare(right.result_date),
              ),
            }))
            .sort((left, right) => left.testName.localeCompare(right.testName, 'zh-CN')),
        };
      })
      .sort((left, right) => left.panelName.localeCompare(right.panelName, 'zh-CN'));
  }, [data]);

  const currentPanel = useMemo(
    () => panelGroups.find(group => group.panelName === selectedPanel) ?? null,
    [panelGroups, selectedPanel],
  );

  useEffect(() => {
    if (panelGroups.length === 0) {
      if (selectedPanel) {
        setSelectedPanel('');
      }
      return;
    }

    if (!panelGroups.some(group => group.panelName === selectedPanel)) {
      setSelectedPanel(panelGroups[0].panelName);
    }
  }, [panelGroups, selectedPanel]);

  const chartData = useMemo(
    () =>
      (currentPanel?.metrics ?? []).flatMap(metric =>
        metric.items.map(item => ({
          date: item.result_date_text || item.result_date,
          value: item.numeric_value ?? 0,
          series: metric.label,
          unit: metric.unit,
          resultText: item.result_text,
        })),
      ),
    [currentPanel],
  );

  const panelUnits = useMemo(() => {
    if (!currentPanel) {
      return [];
    }

    return Array.from(new Set(currentPanel.metrics.map(metric => metric.unit).filter(Boolean)));
  }, [currentPanel]);

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
      highlightTerms: [item.panel_name, item.test_name],
    });
  };

  return (
    <PageStack>
      <div>
        <Typography.Title level={isMobile ? 4 : 3}>检查结果</Typography.Title>
        <Typography.Paragraph>
          趋势区现在只保留“检查包”这一层入口。选中一个大项后，图上会直接展示这个检查包里的所有子指标；想单看某一项时，
          可以直接点图例把其他线隐藏掉。
        </Typography.Paragraph>
      </div>

      <Card variant="borderless">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            指标趋势
          </Typography.Title>
          {panelGroups.length > 0 ? (
            <>
              <ChartToolbar>
                <Select
                  value={selectedPanel || undefined}
                  onChange={value => setSelectedPanel(value)}
                  options={panelGroups.map(group => ({
                    label: group.hasCountMismatch
                      ? `${group.displayName}（已识别 ${group.metrics.length} 项）`
                      : `${group.displayName}（${group.metrics.length} 项）`,
                    value: group.panelName,
                  }))}
                  placeholder="选择检查包"
                  showSearch
                  optionFilterProp="label"
                  style={{ width: isMobile ? '100%' : 360 }}
                />
              </ChartToolbar>

              {currentPanel ? (
                <Typography.Text type="secondary">
                  当前检查包为“{currentPanel.displayName}”，已识别 {currentPanel.metrics.length} 个子指标
                  {panelUnits.length > 0 ? `，涉及 ${panelUnits.join('、')}` : ''}
                  。
                  {currentPanel.hasCountMismatch
                    ? ` 原报告标题写的是“${currentPanel.panelName}”，但当前实际识别到的是这 ${currentPanel.metrics.length} 项。`
                    : ''}
                  点击图例可隐藏或恢复某个指标，用来切换整体视图和单项视图。
                </Typography.Text>
              ) : null}

              {chartData.length > 0 ? (
                <Line
                  data={chartData}
                  xField="date"
                  yField="value"
                  seriesField="series"
                  colorField="series"
                  point
                  height={isMobile ? 260 : 340}
                  color={token.colorPrimary}
                  meta={{
                    date: { alias: '日期' },
                    value: { alias: '结果值' },
                    series: { alias: '指标项' },
                  }}
                  axis={{ x: { title: false }, y: { title: false } }}
                  interaction={{
                    legendFilter: true,
                    legendHighlight: true,
                    elementHighlightByColor: true,
                  }}
                />
              ) : (
                <Empty description="当前检查包下没有可绘制的数值指标" />
              )}
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
            scroll={{ x: 1160 }}
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
                title: '检查包',
                dataIndex: 'panel_name',
                width: isMobile ? 160 : 200,
                render: value => {
                  const panel = panelGroups.find(item => item.panelName === value);
                  if (!panel) {
                    return value;
                  }
                  return panel.hasCountMismatch ? `${panel.displayName}（已识别 ${panel.metrics.length} 项）` : panel.displayName;
                },
              },
              {
                title: '指标项',
                dataIndex: 'test_name',
                width: isMobile ? 140 : 180,
              },
              {
                title: '来源',
                dataIndex: 'test_group',
                width: 110,
                responsive: ['md'],
              },
              {
                title: '结果',
                dataIndex: 'result_text',
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 96,
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
