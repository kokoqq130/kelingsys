import {
  ClockCircleOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MedicineBoxOutlined,
  PictureOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Grid,
  List,
  Skeleton,
  Space,
  Statistic,
  Steps,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import { useApiResource } from '@/hooks/useApiResource';
import type {
  AdmissionPeriodDetail,
  AdmissionPeriodSummary,
  DocumentItem,
  EventItem,
  FileItem,
  LabItem,
} from '@/types/api';
import {
  buildPreviewHighlightTerms,
  inferPreviewFileType,
  resolvePreviewTitle,
} from '@/utils/filePreview';

const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 1180px) {
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
`;

const PeriodButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid ${props => (props.$active ? 'rgba(34, 197, 94, 0.9)' : 'rgba(187, 247, 208, 0.74)')};
  border-radius: 16px;
  color: inherit;
  text-align: left;
  background: ${props =>
    props.$active
      ? 'linear-gradient(180deg, rgba(220, 252, 231, 0.92), rgba(187, 247, 208, 0.78))'
      : 'rgba(255, 255, 255, 0.76)'};
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    border-color: rgba(34, 197, 94, 0.88);
    background: rgba(240, 253, 244, 0.96);
    transform: translateY(-1px);
  }
`;

const DetailStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const SummaryCard = styled(Card)`
  .ant-card-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
`;

const SummaryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const SummaryBody = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SoftPanel = styled.div`
  padding: 14px 16px;
  border: 1px solid rgba(134, 239, 172, 0.74);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.92), rgba(220, 252, 231, 0.74));
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled(Card)`
  .ant-card-body {
    padding: 16px;
  }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const SideCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const TimelineWrap = styled.div`
  .ant-timeline-item {
    padding-bottom: 18px;
  }
`;

const TimelineContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const PanelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const PanelCard = styled.div`
  padding: 14px 16px;
  border: 1px solid rgba(187, 247, 208, 0.72);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
`;

const MultiSectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const kindLabelMap: Record<string, string> = {
  admission_note: '住院周期整理',
  discharge_summary: '出院小结',
  report_index: '报告目录',
  other: '其他文档',
};

const eventLabelMap: Record<string, string> = {
  admission: '入院',
  seizure: '发作',
  lab: '检查',
  medication_adjustment: '调药',
  discharge: '出院',
};

const eventColorMap: Record<string, string> = {
  admission: 'blue',
  seizure: 'red',
  lab: 'green',
  medication_adjustment: 'gold',
  discharge: 'cyan',
};

const { useBreakpoint } = Grid;

function describeDocumentKind(value: string): string {
  return kindLabelMap[value] || '文档';
}

function buildProcessSteps(period: AdmissionPeriodSummary, detail: AdmissionPeriodDetail | null) {
  const panelCount = new Set((detail?.labs ?? []).map(item => item.panel_name)).size;

  return [
    {
      title: '入院',
      description: period.admission_date_text || '待补',
      status: period.admission_date ? 'finish' : 'wait',
    },
    {
      title: '主要事件',
      description: period.main_event || period.summary || '待补',
      status: period.main_event || period.summary ? 'finish' : 'wait',
    },
    {
      title: '检查',
      description: panelCount > 0 ? `已整理 ${panelCount} 组检查` : '待补',
      status: panelCount > 0 ? 'finish' : 'wait',
    },
    {
      title: '调药',
      description: period.medication_change || '本次未单独记录调药',
      status: period.medication_change ? 'finish' : 'wait',
    },
    {
      title: '出院',
      description: period.discharge_date_text || period.status || '待补',
      status: period.discharge_date ? 'finish' : 'wait',
    },
  ] as const;
}

const AdmissionsPage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);
  const { data: periods, error: periodsError, loading: periodsLoading } = useApiResource(
    medicalApi.getAdmissionPeriods,
    [],
  );

  const periodIdParam = searchParams.get('periodId');
  const selectedPeriodId = useMemo(() => {
    if (!periods?.length) {
      return null;
    }

    const requestedId = Number(periodIdParam);
    if (!Number.isNaN(requestedId) && periods.some(item => item.id === requestedId)) {
      return requestedId;
    }

    return periods[0].id;
  }, [periodIdParam, periods]);

  useEffect(() => {
    if (!periods?.length || !selectedPeriodId) {
      return;
    }

    if (periodIdParam !== String(selectedPeriodId)) {
      setSearchParams({ periodId: String(selectedPeriodId) }, { replace: true });
    }
  }, [periodIdParam, periods, selectedPeriodId, setSearchParams]);

  const {
    data: detail,
    error: detailError,
    loading: detailLoading,
  } = useApiResource<AdmissionPeriodDetail | null>(
    () =>
      selectedPeriodId
        ? medicalApi.getAdmissionPeriodDetail(selectedPeriodId)
        : Promise.resolve(null),
    [selectedPeriodId],
  );

  const selectedPeriod = useMemo(
    () => detail?.period || periods?.find(item => item.id === selectedPeriodId) || null,
    [detail, periods, selectedPeriodId],
  );

  const panelGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        panelName: string;
        items: LabItem[];
        abnormalItems: LabItem[];
        sourceDocumentId?: number;
      }
    >();

    for (const item of detail?.labs ?? []) {
      const nextGroup = groups.get(item.panel_name) ?? {
        panelName: item.panel_name,
        items: [],
        abnormalItems: [],
        sourceDocumentId: item.source_document_id,
      };
      nextGroup.items.push(item);
      if (item.status === 'high' || item.status === 'low') {
        nextGroup.abnormalItems.push(item);
      }
      if (!nextGroup.sourceDocumentId && item.source_document_id) {
        nextGroup.sourceDocumentId = item.source_document_id;
      }
      groups.set(item.panel_name, nextGroup);
    }

    return Array.from(groups.values());
  }, [detail?.labs]);

  const flowItems = useMemo(() => {
    const items = (detail?.events ?? []).map(item => ({
      key: `event-${item.id}`,
      eventType: item.event_type,
      date: item.event_date_text || item.event_date,
      title: eventLabelMap[item.event_type] || item.title,
      summary: item.summary,
      detail: item.detail_text,
      sourceDocumentId: item.source_document_id,
      highlightTerms: buildPreviewHighlightTerms(item.title, item.summary, item.detail_text),
    }));

    if (
      selectedPeriod?.medication_change &&
      !items.some(item => item.eventType === 'medication_adjustment')
    ) {
      items.push({
        key: 'period-medication-change',
        eventType: 'medication_adjustment',
        date: selectedPeriod.admission_date_text || selectedPeriod.period_text,
        title: '调药',
        summary: selectedPeriod.medication_change,
        detail: '住院周期整理中已记录本次调药。',
        sourceDocumentId: selectedPeriod.source_document_id,
        highlightTerms: buildPreviewHighlightTerms(selectedPeriod.medication_change, '调药'),
      });
    }

    return items;
  }, [detail?.events, selectedPeriod]);

  const abnormalHighlights = useMemo(() => {
    return panelGroups
      .flatMap(group => group.abnormalItems.map(item => `${group.panelName}：${item.test_name} ${item.result_text}`))
      .slice(0, 6);
  }, [panelGroups]);

  const openPeriod = (periodId: number) => {
    setSearchParams({ periodId: String(periodId) });
  };

  const openDocumentPreview = async (
    documentId: number,
    fallbackTitle: string,
    highlightTerms?: string[],
  ) => {
    try {
      const document = await medicalApi.getDocumentDetail(documentId);
      setPreviewTarget({
        title: resolvePreviewTitle(document.relative_path, fallbackTitle),
        relativePath: document.relative_path,
        rawUrl: document.raw_url,
        fileType: 'markdown',
        markdownContent: document.content_text,
        highlightLabel: fallbackTitle,
        highlightTerms,
      });
    } catch {
      return;
    }
  };

  const openFolderDocument = (document: DocumentItem) => {
    void openDocumentPreview(document.id, document.title, buildPreviewHighlightTerms(document.title));
  };

  const openRawFile = (file: FileItem) => {
    setPreviewTarget({
      title: resolvePreviewTitle(file.relative_path, file.file_name),
      relativePath: file.relative_path,
      rawUrl: file.raw_url,
      fileType: inferPreviewFileType(file.relative_path),
    });
  };

  if (periodsError) {
    return (
      <Card variant="borderless">
        <Empty description={periodsError} />
      </Card>
    );
  }

  if (!periodsLoading && !periods?.length) {
    return (
      <Card variant="borderless">
        <Empty description="当前还没有整理出可查看的住院周期" />
      </Card>
    );
  }

  const processSteps = selectedPeriod ? buildProcessSteps(selectedPeriod, detail) : [];

  return (
    <PageStack>
      <div>
        <Typography.Title level={isMobile ? 4 : 3}>住院周期</Typography.Title>
        <Typography.Paragraph>
          这里按“单次住院”来看全过程，能把本次经过、检查、调药和文档资料集中放在一个视角里。
        </Typography.Paragraph>
      </div>

      <LayoutGrid>
        <SidebarStack>
          <Card variant="borderless" loading={periodsLoading}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>已整理的住院周期</Typography.Text>
                <Typography.Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>
                  先选本次住院，再看下面的流程、检查和资料。
                </Typography.Paragraph>
              </div>

              {(periods ?? []).map(item => (
                <PeriodButton
                  key={item.id}
                  type="button"
                  $active={selectedPeriodId === item.id}
                  onClick={() => openPeriod(item.id)}
                >
                  <Space size={[8, 8]} wrap>
                    <Typography.Text strong>{item.period_text}</Typography.Text>
                    {item.status ? <Tag color="processing">{item.status}</Tag> : null}
                  </Space>
                  <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                    {item.summary}
                  </Typography.Paragraph>
                </PeriodButton>
              ))}
            </Space>
          </Card>
        </SidebarStack>

        <DetailStack>
          {detailLoading && !detail ? (
            <SummaryCard variant="borderless">
              <Skeleton active paragraph={{ rows: 10 }} />
            </SummaryCard>
          ) : null}

          {detailError ? (
            <Card variant="borderless">
              <Empty description={detailError} />
            </Card>
          ) : null}

          {selectedPeriod && detail ? (
            <>
              <SummaryCard variant="borderless">
                <SummaryHeader>
                  <div>
                    <Space size={[8, 8]} wrap>
                      <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                        {selectedPeriod.period_text}
                      </Typography.Title>
                      {selectedPeriod.status ? <Tag color="processing">{selectedPeriod.status}</Tag> : null}
                    </Space>
                    <Typography.Paragraph style={{ margin: '10px 0 0' }}>
                      {selectedPeriod.summary}
                    </Typography.Paragraph>
                  </div>

                  <Space wrap>
                    <Button
                      icon={<ReadOutlined />}
                      onClick={() =>
                        void openDocumentPreview(
                          selectedPeriod.source_document_id,
                          selectedPeriod.title,
                          buildPreviewHighlightTerms(
                            selectedPeriod.summary,
                            selectedPeriod.main_event,
                            selectedPeriod.medication_change,
                          ),
                        )
                      }
                    >
                      预览住院整理
                    </Button>
                  </Space>
                </SummaryHeader>

                <SummaryBody>
                  <SoftPanel>
                    <Typography.Text strong>入院原因</Typography.Text>
                    <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                      {selectedPeriod.admission_reason || '当前还没有单独整理入院原因。'}
                    </Typography.Paragraph>
                  </SoftPanel>
                  <SoftPanel>
                    <Typography.Text strong>周期内症状</Typography.Text>
                    <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                      {selectedPeriod.symptoms || '当前还没有单独整理症状摘要。'}
                    </Typography.Paragraph>
                  </SoftPanel>
                  <SoftPanel>
                    <Typography.Text strong>主要事件</Typography.Text>
                    <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                      {selectedPeriod.main_event || '当前还没有单独整理主要事件。'}
                    </Typography.Paragraph>
                  </SoftPanel>
                  <SoftPanel>
                    <Typography.Text strong>处置经过</Typography.Text>
                    <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                      {selectedPeriod.treatment || '当前还没有单独整理处置经过。'}
                    </Typography.Paragraph>
                  </SoftPanel>
                </SummaryBody>
              </SummaryCard>

              <Card variant="borderless" title="本次住院流程">
                <Steps
                  direction={isMobile ? 'vertical' : 'horizontal'}
                  items={processSteps.map(item => ({
                    title: item.title,
                    description: item.description,
                    status: item.status,
                  }))}
                />
              </Card>

              <MetricGrid>
                <MetricCard variant="borderless">
                  <Statistic
                    title="流程节点"
                    value={flowItems.length}
                    prefix={<ClockCircleOutlined />}
                  />
                </MetricCard>
                <MetricCard variant="borderless">
                  <Statistic
                    title="检查项目"
                    value={detail.labs.length}
                    prefix={<ExperimentOutlined />}
                  />
                </MetricCard>
                <MetricCard variant="borderless">
                  <Statistic
                    title="本次文档"
                    value={detail.documents.length}
                    prefix={<FileTextOutlined />}
                  />
                </MetricCard>
                <MetricCard variant="borderless">
                  <Statistic
                    title="原始资料"
                    value={detail.raw_files.length}
                    prefix={<FolderOpenOutlined />}
                  />
                </MetricCard>
              </MetricGrid>

              <SectionGrid>
                <Card variant="borderless" title="流程时间线">
                  <TimelineWrap>
                    <Timeline
                      items={flowItems.map(item => ({
                        color: eventColorMap[item.eventType] || 'blue',
                        children: (
                          <TimelineContent>
                            <Space size={[8, 8]} wrap>
                              <Typography.Text strong>{item.date}</Typography.Text>
                              <Tag color={eventColorMap[item.eventType] || 'default'}>
                                {eventLabelMap[item.eventType] || item.title}
                              </Tag>
                            </Space>
                            <Typography.Text>{item.summary}</Typography.Text>
                            <Typography.Text type="secondary">{item.detail}</Typography.Text>
                            {item.sourceDocumentId ? (
                              <Button
                                type="link"
                                style={{ paddingInline: 0 }}
                                onClick={() =>
                                  void openDocumentPreview(
                                    item.sourceDocumentId,
                                    item.title,
                                    item.highlightTerms,
                                  )
                                }
                              >
                                预览来源
                              </Button>
                            ) : null}
                          </TimelineContent>
                        ),
                      }))}
                    />
                  </TimelineWrap>
                </Card>

                <SideCards>
                  <Card variant="borderless" title="本次调药">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Space size={[8, 8]} wrap>
                        <Tag color={selectedPeriod.medication_change ? 'gold' : 'default'}>
                          调药记录
                        </Tag>
                        {selectedPeriod.medication_change ? (
                          <Tag color="success">已整理</Tag>
                        ) : null}
                      </Space>
                      <Typography.Paragraph style={{ marginBottom: 0 }}>
                        {selectedPeriod.medication_change || '当前这次住院里还没有单独整理出调药内容。'}
                      </Typography.Paragraph>
                      {selectedPeriod.medication_change ? (
                        <Button
                          icon={<MedicineBoxOutlined />}
                          onClick={() =>
                            void openDocumentPreview(
                              selectedPeriod.source_document_id,
                              selectedPeriod.title,
                              buildPreviewHighlightTerms(selectedPeriod.medication_change, '调药'),
                            )
                          }
                        >
                          预览调药来源
                        </Button>
                      ) : null}
                    </Space>
                  </Card>

                  <Card variant="borderless" title="本次检查重点">
                    {abnormalHighlights.length > 0 ? (
                      <List
                        size="small"
                        dataSource={abnormalHighlights}
                        renderItem={item => <List.Item>{item}</List.Item>}
                      />
                    ) : (
                      <Typography.Paragraph style={{ marginBottom: 0 }}>
                        当前这次住院里没有单独筛出明显异常的重点项目，更多还是要结合完整检查去看。
                      </Typography.Paragraph>
                    )}
                  </Card>
                </SideCards>
              </SectionGrid>

              <Card variant="borderless" title="本次检查分组">
                {panelGroups.length > 0 ? (
                  <PanelGrid>
                    {panelGroups.map(group => (
                      <PanelCard key={group.panelName}>
                        <Space size={[8, 8]} wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Typography.Text strong>{group.panelName}</Typography.Text>
                          <Space size={[6, 6]} wrap>
                            <Tag>{group.items.length} 项</Tag>
                            {group.abnormalItems.length > 0 ? (
                              <Tag color="warning">{group.abnormalItems.length} 项需关注</Tag>
                            ) : null}
                          </Space>
                        </Space>
                        <Typography.Paragraph style={{ margin: '10px 0 12px' }}>
                          {group.abnormalItems.length > 0
                            ? group.abnormalItems
                                .slice(0, 3)
                                .map(item => `${item.test_name} ${item.result_text}`)
                                .join('；')
                            : '这组检查目前没有单独标出明显异常项。'}
                        </Typography.Paragraph>
                        {group.sourceDocumentId ? (
                          <Button
                            type="link"
                            style={{ paddingInline: 0 }}
                            onClick={() =>
                              void openDocumentPreview(
                                group.sourceDocumentId!,
                                group.panelName,
                                buildPreviewHighlightTerms(
                                  group.panelName,
                                  ...group.abnormalItems.map(item => item.test_name),
                                ),
                              )
                            }
                          >
                            预览这组检查
                          </Button>
                        ) : null}
                      </PanelCard>
                    ))}
                  </PanelGrid>
                ) : (
                  <Empty description="当前这次住院还没有结构化检查数据" />
                )}
              </Card>

              <MultiSectionGrid>
                <Card variant="borderless" title="本次文档">
                  <List
                    dataSource={detail.documents}
                    locale={{ emptyText: '当前这次住院还没有文档资料' }}
                    renderItem={item => (
                      <List.Item
                        actions={[
                          <Button key="preview" type="link" onClick={() => openFolderDocument(item)}>
                            侧边预览
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space size={[8, 8]} wrap>
                              <span>{item.title}</span>
                              <Tag>{describeDocumentKind(item.doc_kind)}</Tag>
                            </Space>
                          }
                          description={item.relative_path}
                        />
                      </List.Item>
                    )}
                  />
                </Card>

                <Card variant="borderless" title="原始资料">
                  <List
                    dataSource={detail.raw_files}
                    locale={{ emptyText: '当前这次住院还没有原始资料' }}
                    renderItem={item => (
                      <List.Item
                        actions={[
                          item.raw_url ? (
                            <Button key="preview" type="link" onClick={() => openRawFile(item)}>
                              侧边预览
                            </Button>
                          ) : null,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={item.file_type === 'image' ? <PictureOutlined /> : <FileTextOutlined />}
                          title={item.file_name}
                          description={item.relative_path}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </MultiSectionGrid>
            </>
          ) : null}
        </DetailStack>
      </LayoutGrid>

      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </PageStack>
  );
};

export default AdmissionsPage;
