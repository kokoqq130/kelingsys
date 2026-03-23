import { Button, Card, Col, Empty, Input, List, Row, Segmented, Space, Statistic, Tag, Timeline, Typography } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { medicalApi } from '@/api/medical';
import { useApiResource } from '@/hooks/useApiResource';

const MedicationsPage = () => {
  const { data, error, loading } = useApiResource(medicalApi.getMedications, []);
  const [category, setCategory] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
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
                    item.raw_url ? (
                      <Button key="open" type="link" href={item.raw_url} target="_blank">
                        来源
                      </Button>
                    ) : null,
                    item.document_id ? (
                      <Link key="doc" to={`/documents?documentId=${item.document_id}`}>
                        查看文档
                      </Link>
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
                      <Link to={`/documents?documentId=${item.document_id}`}>查看对应文档</Link>
                      {item.raw_url ? (
                        <Button type="link" href={item.raw_url} target="_blank">
                          打开原文
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
    </Space>
  );
};

export default MedicationsPage;
