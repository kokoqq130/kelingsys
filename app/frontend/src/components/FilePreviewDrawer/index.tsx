import {
  FileImageOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { XMarkdown } from '@ant-design/x-markdown';
import { Alert, Button, Drawer, Empty, Grid, Image, Skeleton, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { inferPreviewFileType } from '@/utils/filePreview';
import { rewriteMarkdownLinks } from '@/utils/markdown';

export interface FilePreviewTarget {
  title: string;
  relativePath: string;
  rawUrl?: string | null;
  fileType?: string | null;
  markdownContent?: string | null;
  highlightLabel?: string | null;
  highlightTerms?: string[] | null;
}

const DrawerBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PreviewFrame = styled.iframe<{ $compact: boolean }>`
  width: 100%;
  min-height: ${props => (props.$compact ? '62vh' : 'calc(100vh - 240px)')};
  border: none;
  border-radius: ${props => (props.$compact ? '16px' : '18px')};
  background: rgba(255, 255, 255, 0.8);
`;

const ImageWrap = styled.div<{ $compact: boolean }>`
  display: flex;
  justify-content: center;
  padding: ${props => (props.$compact ? '0 0 8px' : '4px 0 18px')};
`;

const MarkdownWrap = styled.div<{ $compact: boolean }>`
  min-width: 0;
  padding-bottom: ${props => (props.$compact ? '8px' : '16px')};
`;

const PathText = styled(Typography.Text)`
  display: block;
  word-break: break-all;
`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearPreviewHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark[data-preview-highlight="true"]');

  for (const mark of marks) {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  }

  container.normalize();
}

function applyPreviewHighlights(container: HTMLElement, terms: string[]): boolean {
  clearPreviewHighlights(container);

  const normalizedTerms = Array.from(
    new Set(
      terms
        .map(term => term.trim())
        .filter(term => term.length >= 2),
    ),
  ).sort((left, right) => right.length - left.length);

  if (normalizedTerms.length === 0) {
    return false;
  }

  const matcher = new RegExp(`(${normalizedTerms.map(escapeRegExp).join('|')})`, 'giu');
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (!parent || !node.nodeValue?.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      if (parent.closest('mark[data-preview-highlight="true"], pre, code, .ant-tag')) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  let matched = false;

  for (const textNode of textNodes) {
    const text = textNode.nodeValue || '';
    matcher.lastIndex = 0;

    if (!matcher.test(text)) {
      continue;
    }

    matcher.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of text.matchAll(matcher)) {
      const matchText = match[0];
      const index = match.index ?? 0;

      if (index > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, index)));
      }

      const mark = document.createElement('mark');
      mark.dataset.previewHighlight = 'true';
      mark.textContent = matchText;
      fragment.append(mark);
      lastIndex = index + matchText.length;
      matched = true;
    }

    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  if (matched) {
    container.querySelector<HTMLElement>('mark[data-preview-highlight="true"]')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return matched;
}

function resolvePreviewLabel(type: 'markdown' | 'image' | 'pdf' | 'other'): string {
  if (type === 'markdown') {
    return '整理文档';
  }
  if (type === 'image') {
    return '图片';
  }
  if (type === 'pdf') {
    return 'PDF';
  }
  return '文件';
}

function resolvePreviewIcon(type: 'markdown' | 'image' | 'pdf' | 'other') {
  if (type === 'markdown') {
    return <FileMarkdownOutlined />;
  }
  if (type === 'image') {
    return <FileImageOutlined />;
  }
  if (type === 'pdf') {
    return <FilePdfOutlined />;
  }
  return <FileTextOutlined />;
}

interface FilePreviewDrawerProps {
  open: boolean;
  target: FilePreviewTarget | null;
  onClose: () => void;
}

const { useBreakpoint } = Grid;

const FilePreviewDrawer = ({ open, target, onClose }: FilePreviewDrawerProps) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const previewType = useMemo(
    () => inferPreviewFileType(target?.relativePath, target?.fileType),
    [target],
  );
  const markdownRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [highlightStatus, setHighlightStatus] = useState<'idle' | 'matched' | 'missed'>('idle');
  const highlightTerms = useMemo(
    () => (target?.highlightTerms ?? []).map(term => term.trim()).filter(Boolean),
    [target?.highlightTerms],
  );

  useEffect(() => {
    if (!open || !target) {
      return;
    }

    if (previewType !== 'markdown') {
      setMarkdownContent('');
      setError(null);
      setLoading(false);
      return;
    }

    if (target.markdownContent) {
      setMarkdownContent(target.markdownContent);
      setError(null);
      setLoading(false);
      return;
    }

    if (!target.rawUrl) {
      setMarkdownContent('');
      setError('当前文档暂时无法预览。');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(target.rawUrl, {
      headers: {
        Accept: 'text/plain',
      },
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`读取失败（${response.status}）`);
        }
        return response.text();
      })
      .then(text => {
        if (!cancelled) {
          setMarkdownContent(text);
        }
      })
      .catch(requestError => {
        if (!cancelled) {
          setMarkdownContent('');
          setError(requestError instanceof Error ? requestError.message : '预览加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, previewType, target]);

  useEffect(() => {
    setHighlightStatus('idle');
  }, [open, target?.highlightLabel, target?.relativePath]);

  useEffect(() => {
    if (
      !open ||
      previewType !== 'markdown' ||
      loading ||
      error ||
      !markdownContent ||
      !markdownRef.current
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (!markdownRef.current) {
        return;
      }

      setHighlightStatus(
        applyPreviewHighlights(markdownRef.current, highlightTerms) ? 'matched' : 'missed',
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [error, highlightTerms, loading, markdownContent, open, previewType]);

  return (
    <Drawer
      title={
        <Space size={10} wrap>
          {resolvePreviewIcon(previewType)}
          <Typography.Text strong>{target?.title || '资料预览'}</Typography.Text>
          <Tag>{resolvePreviewLabel(previewType)}</Tag>
        </Space>
      }
      placement="right"
      width={isMobile ? '100%' : 760}
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{ body: { padding: isMobile ? 16 : 24 } }}
      extra={
        target?.rawUrl ? (
          <Button
            type="link"
            size={isMobile ? 'small' : 'middle'}
            href={target.rawUrl}
            target="_blank"
            icon={<LinkOutlined />}
          >
            新标签打开
          </Button>
        ) : null
      }
    >
      {!target ? (
        <Empty description="请选择需要预览的资料" />
      ) : (
        <DrawerBody>
          <PathText type="secondary">{target.relativePath}</PathText>

          {loading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}

          {!loading && error ? <Empty description={error} /> : null}

          {!loading &&
          !error &&
          previewType === 'markdown' &&
          target.highlightLabel &&
          highlightStatus !== 'idle' ? (
            <Alert
              type={highlightStatus === 'matched' ? 'success' : 'info'}
              showIcon
              message={
                highlightStatus === 'matched'
                  ? `已为你标记“${target.highlightLabel}”相关内容`
                  : `当前按“${target.highlightLabel}”打开，正文里暂未找到完全匹配的文字`
              }
            />
          ) : null}

          {!loading && !error && previewType === 'markdown' ? (
            <MarkdownWrap $compact={isMobile} ref={markdownRef}>
              <XMarkdown content={rewriteMarkdownLinks(markdownContent, target.relativePath)} />
            </MarkdownWrap>
          ) : null}

          {!loading && !error && previewType === 'image' && target.rawUrl ? (
            <ImageWrap $compact={isMobile}>
              <Image
                src={target.rawUrl}
                alt={target.title}
                style={{ maxWidth: '100%', borderRadius: isMobile ? 16 : 20 }}
              />
            </ImageWrap>
          ) : null}

          {!loading && !error && previewType === 'pdf' && target.rawUrl ? (
            <PreviewFrame $compact={isMobile} src={target.rawUrl} title={target.title} />
          ) : null}

          {!loading && !error && previewType === 'other' ? (
            <Empty description="当前文件类型暂不支持侧边预览" />
          ) : null}
        </DrawerBody>
      )}
    </Drawer>
  );
};

export default FilePreviewDrawer;
