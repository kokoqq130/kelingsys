import { Button, Card, Col, Empty, Input, List, Row, Segmented, Space, Statistic, Tag, Timeline, Typography } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';

import { medicalApi } from '@/api/medical';
import FilePreviewDrawer, { type FilePreviewTarget } from '@/components/FilePreviewDrawer';
import { useApiResource } from '@/hooks/useApiResource';
import type { MedicationAdjustmentItem, MedicationItem } from '@/types/api';
import {
  buildPreviewHighlightTerms,
  inferPreviewFileType,
  resolvePreviewPath,
  resolvePreviewTitle,
} from '@/utils/filePreview';

const MedicationsPage = () => {
  const { data, error, loading } = useApiResource(medicalApi.getMedications, []);
  const [category, setCategory] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);
  const deferredKeyword = useDeferredValue(keyword);

  const categories = useMemo(() => {
    return Array.from(new Set((data?.current ?? []).map(item => item.category)));
  }, [data]);

  const currentMedications = useMemo(() => {
    return (data?.current ?? []).filter(item => {
      const matchesCategory = category === 'all' ? true : item.category === category;
      const matchesKeyword =
        deferredKeyword.trim().length === 0
          ? true
          : `${item.name} ${item.dose_text} ${item.category}`.includes(deferredKeyword.trim());
      return matchesCategory && matchesKeyword;
    });
  }, [category, data, deferredKeyword]);

  const openMedicationPreview = async (item: MedicationItem) => {
    try {
      let previewPath = resolvePreviewPath(undefined, item.raw_url);
      let rawUrl = item.raw_url;
      let markdownContent: string | undefined;

      if (!rawUrl && item.document_id) {
        const detail = await medicalApi.getDocumentDetail(item.document_id);
        previewPath = detail.relative_path;
        rawUrl = detail.raw_url ?? undefined;
        markdownContent = detail.content_text;
      }

      setPreviewTarget({
        title: resolvePreviewTitle(previewPath, item.name),
        relativePath: previewPath,
        rawUrl,
        fileType: inferPreviewFileType(previewPath, rawUrl ? undefined : 'markdown'),
        markdownContent,
        highlightLabel: item.name,
        highlightTerms: buildPreviewHighlightTerms(item.name, item.dose_text, item.note),
      });
    } catch {
      return;
    }
  };

  const openAdjustmentPreview = async (item: MedicationAdjustmentItem) => {
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
        title: resolvePreviewTitle(relativePath, item.summary),
        relativePath,
        rawUrl,
        fileType: inferPreviewFileType(relativePath, rawUrl ? undefined : 'markdown'),
        markdownContent,
        highlightLabel: item.summary,
        highlightTerms: buildPreviewHighlightTerms(item.summary, item.detail_text, item.event_date_text),
      });
    } catch {
      return;
    }
  };

  if (error) {
    return (
      <Card variant="borderless">
        <Empty description={error} />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3}>用药变化</Typography.Title>
        <Typography.Paragraph>
          这一页把当前用药和历次调药放在一起，便于快速回顾“什么时候开始、增加、减少或停用了哪种药”。
        </Typography.Paragraph>
      </div>
      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card variant="borderless">
            <Statistic title="当前用药数量" value={data?.current.length ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless">
            <Statistic title="调药记录数量" value={data?.adjustments.length ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless">
            <Statistic title="用药分类数" value={categories.length} loading={loading} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={11}>
          <Card variant="borderless" title="当前用药" loading={loading}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="按药物名或剂量筛选"
              />
              <Segmented
                value={category}
                onChange={value => setCategory(String(value))}
                options={[
                  { label: '全部', value: 'all' },
                  ...categories.map(item => ({ label: item, value: item })),
                ]}
              />
              <List
                dataSource={currentMedications}
                locale={{ emptyText: '暂无当前用药数据' }}
                renderItem={item => (
                  <List.Item
                    actions={[
                      item.raw_url || item.document_id ? (
                        <Button key="preview" type="link" onClick={() => void openMedicationPreview(item)}>
                          预览来源
                        </Button>
                      ) : null,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <span>{item.name}</span>
                          <Tag>{item.category}</Tag>
                        </Space>
                      }
                      description={item.dose_text}
                    />
                  </List.Item>
                )}
              />
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={13}>
          <Card variant="borderless" title="调药时间轴" loading={loading}>
            <Timeline
              items={(data?.adjustments ?? []).map(item => ({
                color: 'gold',
                children: (
                  <Space direction="vertical" size={6}>
                    <Typography.Text strong>{item.event_date_text || item.event_date}</Typography.Text>
                    <Typography.Text>{item.summary}</Typography.Text>
                    <Typography.Text type="secondary">{item.detail_text}</Typography.Text>
                    <Space wrap>
                      {item.raw_url || item.document_id ? (
                        <Button type="link" onClick={() => void openAdjustmentPreview(item)}>
                          预览文档
                        </Button>
                      ) : null}
                    </Space>
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </Space>
  );
};

export default MedicationsPage;
