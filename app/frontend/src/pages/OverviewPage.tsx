import {
  AlertOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MedicineBoxOutlined,
  ReadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import { Alert, App, Button, Card, Empty, Space, Statistic, Tag, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import StatusBanner from '@/components/StatusBanner';
import { useApiResource } from '@/hooks/useApiResource';

const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
  align-items: stretch;
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ThreeColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FullCard = styled(Card)`
  height: 100%;

  .ant-card-body {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: 16px;
  }
`;

const HeroPrimaryCard = styled(Card)`
  height: 100%;

  .ant-card-body {
    display: grid;
    height: 100%;
    gap: 16px;
    grid-template-rows: auto auto auto minmax(0, 1fr);
  }
`;

const CompactCard = styled(Card)`
  height: 100%;

  .ant-card-body {
    display: grid;
    height: 100%;
    gap: 16px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Kicker = styled(Typography.Text)`
  color: rgba(21, 128, 61, 0.9);
  font-size: 12px;
  letter-spacing: 1.6px;
`;

const HeroTitle = styled(Typography.Title)`
  margin: 0 !important;
`;

const SoftPanel = styled.div`
  padding: 16px 18px;
  border: 1px solid rgba(134, 239, 172, 0.72);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.92), rgba(220, 252, 231, 0.74));
`;

const FactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
`;

const FactItem = styled.div`
  padding: 12px 14px;
  border: 1px solid rgba(187, 247, 208, 0.82);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
`;

const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 12px;

  > * {
    height: 100%;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DiagnosisWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const MetricTile = styled.div`
  display: flex;
  min-height: 120px;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(187, 247, 208, 0.72);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.74);
`;

const MetricIcon = styled.div`
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(220, 252, 231, 0.9);
  color: #15803d;
  font-size: 18px;
`;

const SnapshotStack = styled.div`
  display: grid;
  gap: 10px;

  @media (min-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SnapshotCard = styled.div`
  padding: 14px 16px;
  border: 1px solid rgba(187, 247, 208, 0.76);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
`;

const ClampText = styled.div<{ $rows?: number }>`
  display: -webkit-box;
  overflow: hidden;
  color: rgba(6, 95, 70, 0.72);
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${props => props.$rows ?? 3};
`;

const MedicationStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MedicationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
`;

const MedicationTile = styled.div`
  display: flex;
  min-height: 116px;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid rgba(187, 247, 208, 0.74);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
`;

const HighlightList = styled.div`
  display: grid;
  gap: 12px;
`;

const HighlightItem = styled.div`
  padding: 14px 16px;
  border: 1px solid rgba(187, 247, 208, 0.7);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
`;

const ChartSplit = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
  align-items: center;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const LegendList = styled.div`
  display: grid;
  gap: 10px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const LegendMain = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${props => props.$color};
  box-shadow: 0 0 0 6px color-mix(in srgb, ${props => props.$color} 16%, transparent);
`;

const ScrollArea = styled.div`
  display: grid;
  gap: 12px;
  max-height: 460px;
  overflow: auto;
  padding-right: 4px;
`;

function resolveEventTypeLabel(value?: string): string {
  const map: Record<string, string> = {
    seizure: '发作',
    admission: '住院',
    medication_adjustment: '调药',
    lab: '检查',
  };
  return map[value || ''] || value || '其他';
}

function resolveDocumentKindLabel(value?: string): string {
  const map: Record<string, string> = {
    main_summary: '主文档',
    admission_note: '住院整理',
    report_index: '报告目录',
    other: '其他文档',
  };
  return map[value || ''] || value || '其他';
}

function resolveFileTypeLabel(value?: string): string {
  const map: Record<string, string> = {
    markdown: '整理文档',
    image: '图片',
    pdf: 'PDF',
    other: '其他',
  };
  return map[value || ''] || value || '其他';
}

function resolveLabAlertType(status?: string): 'warning' | 'info' {
  return status === 'high' ? 'warning' : 'info';
}

const OverviewPage = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { data, error, loading, reload } = useApiResource(medicalApi.getOverview, []);
  const { data: documents } = useApiResource(medicalApi.getDocuments, []);
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const handleReindex = async () => {
    await medicalApi.reindex();
    message.success('资料已刷新');
    await reload();
  };

  const patientName = data?.patient['姓名'] || '患者';
  const mainDocument = useMemo(
    () => (documents ?? []).find(item => item.doc_kind === 'main_summary') ?? null,
    [documents],
  );

  const openMainDocumentPreview = async () => {
    if (!mainDocument) {
      message.warning('主文档还没有准备好');
      return;
    }

    try {
      const detail = await medicalApi.getDocumentDetail(mainDocument.id);
      setPreviewTarget({
        title: detail.title,
        relativePath: detail.relative_path,
        rawUrl: detail.raw_url,
        fileType: 'markdown',
        markdownContent: detail.content_text,
      });
    } catch {
      message.error('主文档预览打开失败');
    }
  };

  const patientFacts = useMemo(
    () =>
      Object.entries(data?.patient ?? {}).filter(
        ([key, value]) => key !== '姓名' && String(value).trim().length > 0,
      ),
    [data?.patient],
  );

  const medicationCategoryStats = useMemo(() => {
    const categoryMap = new Map<string, number>();

    for (const item of data?.current_medications ?? []) {
      categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + 1);
    }

    return Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }));
  }, [data?.current_medications]);

  const eventChartData = useMemo(
    () =>
      (data?.event_type_stats ?? []).map(item => ({
        label: resolveEventTypeLabel(item.event_type),
        value: item.count,
      })),
    [data?.event_type_stats],
  );

  const fileChartData = useMemo(
    () =>
      (data?.file_type_stats ?? []).map(item => ({
        label: resolveFileTypeLabel(item.file_type),
        value: item.count,
      })),
    [data?.file_type_stats],
  );

  const eventChartColors = [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorInfo,
    token.colorError,
  ];

  const metricItems = [
    {
      key: 'files',
      label: '原始资料',
      value: data?.stats.file_count ?? 0,
      icon: <FolderOpenOutlined />,
      helper: '图片、PDF 与整理文档',
    },
    {
      key: 'events',
      label: '病程记录',
      value: data?.stats.event_count ?? 0,
      icon: <ClockCircleOutlined />,
      helper: '发作、住院、调药与检查',
    },
    {
      key: 'documents',
      label: '整理文档',
      value: data?.stats.document_count ?? 0,
      icon: <FileTextOutlined />,
      helper: '主文档与住院整理',
    },
    {
      key: 'labs',
      label: '检查条目',
      value: data?.stats.lab_count ?? 0,
      icon: <ExperimentOutlined />,
      helper: '结构化整理后的检查结果',
    },
  ];

  const snapshots = [
    {
      key: 'seizure',
      title: '最近一次发作',
      tone: token.colorWarning,
      date: data?.latest_seizure?.event_date_text || data?.latest_seizure?.event_date || '暂无记录',
      summary: data?.latest_seizure?.summary || '当前还没有整理出最近一次发作摘要。',
    },
    {
      key: 'admission',
      title: '最近一次住院',
      tone: token.colorInfo,
      date: data?.latest_admission?.event_date_text || data?.latest_admission?.event_date || '暂无记录',
      summary: data?.latest_admission?.summary || '当前还没有整理出最近一次住院摘要。',
    },
  ];

  if (loading) {
    return <StatusBanner />;
  }

  if (error || !data) {
    return (
      <FullCard variant="borderless">
        <Empty description={error || '暂时没有读取到总览数据'} />
      </FullCard>
    );
  }

  return (
    <PageStack>
      <StatusBanner
        action={
          <Button
            type="primary"
            ghost
            icon={<ReadOutlined />}
            onClick={() => void openMainDocumentPreview()}
            disabled={!mainDocument}
          >
            快速看主文档
          </Button>
        }
      />

      <HeroGrid>
        <HeroPrimaryCard variant="borderless">
          <CardHeader>
            <HeaderMeta>
              <Kicker>资料总览</Kicker>
              <HeroTitle level={2}>{patientName} 的当前情况</HeroTitle>
            </HeaderMeta>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void handleReindex()}>
              刷新资料
            </Button>
          </CardHeader>

          <SoftPanel>
            <Typography.Text strong>当前状态</Typography.Text>
            <Typography.Paragraph style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.8 }}>
              {data.current_status}
            </Typography.Paragraph>
          </SoftPanel>

          {patientFacts.length > 0 ? (
            <FactGrid>
              {patientFacts.map(([key, value]) => (
                <FactItem key={key}>
                  <Typography.Text type="secondary">{key}</Typography.Text>
                  <Typography.Title level={5} style={{ margin: '8px 0 0' }}>
                    {value}
                  </Typography.Title>
                </FactItem>
              ))}
            </FactGrid>
          ) : null}

          <SplitGrid>
            <SoftPanel>
              <Typography.Text strong>当前最需要关注的问题</Typography.Text>
              <Typography.Paragraph style={{ margin: '10px 0 0', lineHeight: 1.8 }}>
                {data.main_issue || '暂无重点问题摘要。'}
              </Typography.Paragraph>
            </SoftPanel>

            <SoftPanel>
              <Typography.Text strong>主要诊断</Typography.Text>
              {data.diagnoses.length > 0 ? (
                <DiagnosisWrap style={{ marginTop: 12 }}>
                  {data.diagnoses.map(item => (
                    <Tag key={item.name} color="processing">
                      {item.name}
                    </Tag>
                  ))}
                </DiagnosisWrap>
              ) : (
                <Typography.Paragraph style={{ margin: '10px 0 0' }}>
                  暂无诊断信息。
                </Typography.Paragraph>
              )}
            </SoftPanel>
          </SplitGrid>
        </HeroPrimaryCard>

        <CompactCard variant="borderless">
          <HeaderMeta>
            <Kicker>资料概况</Kicker>
            <Typography.Title level={4} style={{ margin: 0 }}>
              关键数字
            </Typography.Title>
          </HeaderMeta>

          <MetricGrid>
            {metricItems.map(item => (
              <MetricTile key={item.key}>
                <MetricIcon>{item.icon}</MetricIcon>
                <Statistic title={item.label} value={item.value} />
                <Typography.Text type="secondary">{item.helper}</Typography.Text>
              </MetricTile>
            ))}
          </MetricGrid>
        </CompactCard>
      </HeroGrid>

      <FullCard variant="borderless">
        <HeaderMeta>
          <Kicker>最近动态</Kicker>
          <Typography.Title level={4} style={{ margin: 0 }}>
            最近一次发作与住院
          </Typography.Title>
          <Typography.Text type="secondary">
            适合先快速看清最近一次发作和最近一次住院。
          </Typography.Text>
        </HeaderMeta>

        <SnapshotStack>
          {snapshots.map(item => (
            <SnapshotCard
              key={item.key}
              style={{
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${item.tone} 32%, transparent)`,
              }}
            >
              <Space size={10} align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text strong>{item.title}</Typography.Text>
                <Tag color="default">{item.date}</Tag>
              </Space>
              <div style={{ marginTop: 8 }}>
                <ClampText>{item.summary}</ClampText>
              </div>
            </SnapshotCard>
          ))}
        </SnapshotStack>
      </FullCard>

      <TwoColumnGrid>
        <FullCard variant="borderless">
          <CardHeader>
            <HeaderMeta>
              <Kicker>目前治疗</Kicker>
              <Typography.Title level={4} style={{ margin: 0 }}>
                当前用药与补充方案
              </Typography.Title>
            </HeaderMeta>
            <MedicationStats>
              {medicationCategoryStats.map(item => (
                <Tag key={item.category} color="success">
                  {item.category} {item.count} 项
                </Tag>
              ))}
            </MedicationStats>
          </CardHeader>

          {data.current_medications.length > 0 ? (
            <MedicationGrid>
              {data.current_medications.map(item => (
                <MedicationTile key={`${item.category}-${item.name}`}>
                  <Space wrap size={[8, 8]}>
                    <Typography.Text strong style={{ fontSize: 16 }}>
                      {item.name}
                    </Typography.Text>
                    <Tag>{item.category}</Tag>
                  </Space>
                  <ClampText $rows={3}>{item.dose_text}</ClampText>
                </MedicationTile>
              ))}
            </MedicationGrid>
          ) : (
            <Empty description="当前没有整理出用药信息" />
          )}
        </FullCard>

        <FullCard variant="borderless">
          <HeaderMeta>
            <Kicker>持续关注</Kicker>
            <Typography.Title level={4} style={{ margin: 0 }}>
              本阶段重点提醒
            </Typography.Title>
          </HeaderMeta>

          <SoftPanel>
            <Space align="start" size={12}>
              <Tag color="warning" bordered={false} icon={<AlertOutlined />}>
                主要问题
              </Tag>
            </Space>
            <Typography.Paragraph style={{ margin: '12px 0 0', lineHeight: 1.8 }}>
              {data.main_issue || '暂无重点问题摘要。'}
            </Typography.Paragraph>
          </SoftPanel>

          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              长期关注
            </Typography.Title>
            {data.highlights.length > 0 ? (
              <HighlightList>
                {data.highlights.map(item => (
                  <HighlightItem key={item}>
                    <ClampText>{item}</ClampText>
                  </HighlightItem>
                ))}
              </HighlightList>
            ) : (
              <Empty description="当前没有额外的长期关注提醒" />
            )}
          </div>
        </FullCard>
      </TwoColumnGrid>

      <ThreeColumnGrid>
        <FullCard variant="borderless">
          <HeaderMeta>
            <Kicker>病程构成</Kicker>
            <Typography.Title level={4} style={{ margin: 0 }}>
              近期记录分布
            </Typography.Title>
          </HeaderMeta>

          {eventChartData.length > 0 ? (
            <ChartSplit>
              <Pie
                data={eventChartData}
                angleField="value"
                colorField="label"
                innerRadius={0.66}
                radius={0.9}
                legend={false}
                label={false}
                height={240}
                color={eventChartColors}
              />
              <LegendList>
                {eventChartData.map((item, index) => (
                  <LegendItem key={item.label}>
                    <LegendMain>
                      <LegendDot $color={eventChartColors[index % eventChartColors.length]} />
                      <Typography.Text>{item.label}</Typography.Text>
                    </LegendMain>
                    <Typography.Text type="secondary">{item.value}</Typography.Text>
                  </LegendItem>
                ))}
              </LegendList>
            </ChartSplit>
          ) : (
            <Empty description="当前没有可展示的病程记录分布" />
          )}
        </FullCard>

        <FullCard variant="borderless">
          <HeaderMeta>
            <Kicker>资料构成</Kicker>
            <Typography.Title level={4} style={{ margin: 0 }}>
              整理资料分布
            </Typography.Title>
          </HeaderMeta>

          {fileChartData.length > 0 ? (
            <>
              <Column
                data={fileChartData}
                xField="label"
                yField="value"
                legend={false}
                label={false}
                height={240}
                color={token.colorPrimary}
                axis={{
                  x: { labelAutoRotate: false },
                  y: { title: false },
                }}
              />
              <Space wrap size={[8, 8]}>
                {data.document_kind_stats.map(item => (
                  <Tag key={item.doc_kind} color="processing">
                    {resolveDocumentKindLabel(item.doc_kind)} {item.count}
                  </Tag>
                ))}
              </Space>
            </>
          ) : (
            <Empty description="当前没有可展示的资料分布" />
          )}
        </FullCard>

        <FullCard variant="borderless">
          <HeaderMeta>
            <Kicker>异常检查</Kicker>
            <Typography.Title level={4} style={{ margin: 0 }}>
              近期重点结果
            </Typography.Title>
          </HeaderMeta>

          {data.abnormal_labs.length > 0 ? (
            <ScrollArea>
              {data.abnormal_labs.map(item => (
                <Alert
                  key={`${item.result_date}-${item.test_name}`}
                  type={resolveLabAlertType(item.status)}
                  showIcon
                  message={`${item.result_date_text || item.result_date} · ${item.test_name}`}
                  description={<ClampText>{item.result_text}</ClampText>}
                />
              ))}
            </ScrollArea>
          ) : (
            <Empty description="当前没有需要特别提示的异常检查" />
          )}
        </FullCard>
      </ThreeColumnGrid>

      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </PageStack>
  );
};

export default OverviewPage;
