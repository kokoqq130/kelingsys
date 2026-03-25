import { Button, Card, Empty, Grid, Input, Segmented, Space, Tag, Timeline, Typography } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';
import styled from 'styled-components';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import { useApiResource } from '@/hooks/useApiResource';
import type { EventItem } from '@/types/api';
import { buildPreviewHighlightTerms, inferPreviewFileType, resolvePreviewTitle } from '@/utils/filePreview';

const eventTypeMap: Record<string, { label: string; color: string }> = {
  seizure: { label: '发作', color: 'red' },
  admission: { label: '入院', color: 'blue' },
  discharge: { label: '出院', color: 'cyan' },
  medication_adjustment: { label: '调药', color: 'gold' },
  lab: { label: '检查', color: 'green' },
};

const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 768px) {
    gap: 16px;
  }
`;

const TimelineWrap = styled.div`
  .ant-timeline-item {
    padding-bottom: 20px;
  }

  @media (max-width: 768px) {
    .ant-timeline-item {
      padding-bottom: 18px;
    }

    .ant-timeline-item-content {
      min-width: 0;
    }
  }
`;

const EventContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const EventMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const { useBreakpoint } = Grid;

const TimelinePage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [filter, setFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);
  const deferredKeyword = useDeferredValue(keyword);
  const { data, error, loading } = useApiResource(medicalApi.getTimeline, []);

  const filteredItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.filter(item => {
      const matchesFilter = filter === 'all' ? true : item.event_type === filter;
      const matchesKeyword =
        deferredKeyword.trim().length === 0
          ? true
          : `${item.summary} ${item.detail_text}`.includes(deferredKeyword.trim());
      return matchesFilter && matchesKeyword;
    });
  }, [data, deferredKeyword, filter]);

  const filterOptions = useMemo(() => {
    const types = Array.from(new Set((data ?? []).map(item => item.event_type)));
    const labels: Record<string, string> = {
      seizure: '发作',
      admission: '入院',
      discharge: '出院',
      medication_adjustment: '调药',
      lab: '检查',
    };

    return [{ label: '全部', value: 'all' }].concat(
      types.map(type => ({
        label: labels[type] || type,
        value: type,
      })),
    );
  }, [data]);

  const openPreview = async (item: EventItem) => {
    try {
      let relativePath = item.relative_path;
      let rawUrl = item.raw_url;
      let markdownContent: string | undefined;

      if (!rawUrl && item.source_document_id) {
        const detail = await medicalApi.getDocumentDetail(item.source_document_id);
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
        highlightLabel: item.title || item.summary,
        highlightTerms: buildPreviewHighlightTerms(item.title, item.summary, item.detail_text),
      });
    } catch {
      return;
    }
  };

  if (loading) {
    return <Card variant="borderless">正在加载时间线...</Card>;
  }

  if (error || !data) {
    return (
      <Card variant="borderless">
        <Empty description={error || '暂时没有时间线数据'} />
      </Card>
    );
  }

  return (
    <Card variant="borderless">
      <PageStack>
        <div>
          <Typography.Title level={isMobile ? 4 : 3}>时间线</Typography.Title>
          <Typography.Paragraph>
            这里按时间顺序梳理发作、住院、调药和检查，方便快速回顾每次变化。
          </Typography.Paragraph>
        </div>
        <Segmented
          value={filter}
          onChange={value => setFilter(String(value))}
          options={filterOptions}
        />
        <Input
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          placeholder="按事件描述筛选，例如：呕吐、吡仑帕奈、血氨"
        />
        <TimelineWrap>
          <Timeline
            items={filteredItems.map(item => ({
              color: eventTypeMap[item.event_type]?.color || 'gray',
              children: (
                <EventContent>
                  <EventMeta>
                    <Typography.Text strong>{item.event_date_text || item.event_date}</Typography.Text>
                    <Tag color={eventTypeMap[item.event_type]?.color || 'default'}>
                      {eventTypeMap[item.event_type]?.label || item.event_type}
                    </Tag>
                    {item.is_hospitalized ? <Tag color="purple">住院相关</Tag> : null}
                    {item.admission_status ? <Tag color="processing">{item.admission_status}</Tag> : null}
                  </EventMeta>
                  {item.admission_period_text ? (
                    <Typography.Text type="secondary">{item.admission_period_text}</Typography.Text>
                  ) : null}
                  <Typography.Text>{item.summary}</Typography.Text>
                  <Typography.Text type="secondary">{item.detail_text}</Typography.Text>
                  {item.source_document_id || item.raw_url ? (
                    <Button type="link" onClick={() => void openPreview(item)}>
                      预览文档
                    </Button>
                  ) : null}
                </EventContent>
              ),
            }))}
          />
        </TimelineWrap>
      </PageStack>
      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </Card>
  );
};

export default TimelinePage;
