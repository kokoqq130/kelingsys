import {
  ClockCircleOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  FundOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  MenuOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Grid, Layout, Menu, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const ShellLayout = styled(Layout)`
  min-height: 100vh;
  background: transparent;
`;

const SidebarPanel = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.66);
  border-right: 1px solid rgba(134, 239, 172, 0.68);
  backdrop-filter: blur(18px);
`;

const BrandBlock = styled.div`
  position: relative;
  overflow: hidden;
  padding: 28px 22px 24px;
  color: #f0fdf4;
  background: linear-gradient(145deg, #14532d 0%, #16a34a 58%, #4ade80 100%);

  &::before,
  &::after {
    position: absolute;
    border-radius: 999px;
    content: '';
    pointer-events: none;
  }

  &::before {
    top: -46px;
    right: -18px;
    width: 160px;
    height: 160px;
    background: rgba(240, 253, 244, 0.14);
  }

  &::after {
    bottom: -50px;
    left: -24px;
    width: 140px;
    height: 140px;
    background: rgba(20, 83, 45, 0.24);
  }
`;

const HeaderCard = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px;
  border: 1px solid rgba(134, 239, 172, 0.72);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 28px 54px -40px rgba(34, 197, 94, 0.4);
  backdrop-filter: blur(16px);

  @media (max-width: 992px) {
    padding: 20px;
    border-radius: 24px;
  }
`;

const HeaderBar = styled(Header)`
  height: auto;
  padding: 20px 20px 0;
  line-height: normal;
  background: transparent;
`;

const ContentWrap = styled(Content)`
  padding: 20px;
`;

const ContentInner = styled.div`
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 18px 18px 22px;
`;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">总览</Link> },
  { key: '/timeline', icon: <ClockCircleOutlined />, label: <Link to="/timeline">时间线</Link> },
  { key: '/medications', icon: <MedicineBoxOutlined />, label: <Link to="/medications">用药变化</Link> },
  { key: '/labs', icon: <FundOutlined />, label: <Link to="/labs">检查结果</Link> },
  { key: '/documents', icon: <FileTextOutlined />, label: <Link to="/documents">文档资料</Link> },
  { key: '/files', icon: <FolderOpenOutlined />, label: <Link to="/files">原始文件</Link> },
  { key: '/search', icon: <SearchOutlined />, label: <Link to="/search">搜索</Link> },
];

const AppLayout = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  const menu = (
    <SidebarPanel>
      <BrandBlock>
        <Typography.Text style={{ color: 'rgba(240,253,244,0.72)', fontSize: 12, letterSpacing: 2.4 }}>
          QUERY-FIRST WORKSPACE
        </Typography.Text>
        <Typography.Title level={3} style={{ color: '#ffffff', margin: '10px 0 8px' }}>
          柯灵资料查询系统
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(240,253,244,0.82)', marginBottom: 16 }}>
          围绕真实文档、时间线和原始文件做查询，不把资料工作强行改造成表单后台。
        </Typography.Paragraph>
        <Space wrap size={[8, 8]}>
          <Tag bordered={false} color="success">
            查询优先
          </Tag>
          <Tag bordered={false} color="processing">
            Ant Design
          </Tag>
          <Tag bordered={false} color="warning">
            原始文件直达
          </Tag>
        </Space>
      </BrandBlock>
      <Menu
        mode="inline"
        items={menuItems}
        selectedKeys={selectedKeys}
        onClick={() => setDrawerOpen(false)}
        style={{ borderInlineEnd: 'none', paddingTop: 14 }}
      />
      <SidebarFooter>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          建议入口
        </Typography.Text>
        <Typography.Paragraph style={{ marginBottom: 8, color: 'rgba(6, 95, 70, 0.7)' }}>
          先看总览和时间线，再跳到文档资料或原始文件确认来源。
        </Typography.Paragraph>
        <Space wrap size={[8, 8]}>
          <Tag bordered={false}>/documents</Tag>
          <Tag bordered={false}>/files</Tag>
          <Tag bordered={false}>/search</Tag>
        </Space>
      </SidebarFooter>
    </SidebarPanel>
  );

  return (
    <ShellLayout>
      {!isMobile ? (
        <Sider width={300} theme="light" style={{ background: 'transparent' }}>
          {menu}
        </Sider>
      ) : (
        <Drawer
          placement="left"
          width={280}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { padding: 0 } }}
        >
          {menu}
        </Drawer>
      )}
      <Layout>
        <HeaderBar>
          <HeaderCard>
            <Space align="start" size={16} style={{ width: '100%', justifyContent: 'space-between' }} wrap>
              <Space align="start" size={16}>
                {isMobile ? (
                  <Button
                    icon={<MenuOutlined />}
                    shape="circle"
                    onClick={() => setDrawerOpen(true)}
                  />
                ) : null}
                <div>
                  <Typography.Text style={{ color: 'rgba(21, 128, 61, 0.9)', letterSpacing: 1.6 }}>
                    MEDICAL QUERY DESK
                  </Typography.Text>
                  <Typography.Title level={2} style={{ margin: '8px 0 8px' }}>
                    查询优先的资料工作台
                  </Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, maxWidth: 760 }}>
                    已接入真实资料索引、调药时间轴、Markdown 预览和原始文件浏览，适合快速准备医生沟通和病程回溯。
                  </Typography.Paragraph>
                </div>
              </Space>
              <Space wrap size={[8, 8]} style={{ justifyContent: 'flex-end' }}>
                <Tag bordered={false} color="success">
                  当前资料索引
                </Tag>
                <Tag bordered={false} color="processing">
                  调药时间线
                </Tag>
                <Tag bordered={false} color="warning">
                  原始文件代理
                </Tag>
              </Space>
            </Space>
          </HeaderCard>
        </HeaderBar>
        <ContentWrap>
          <ContentInner>
            <Outlet />
          </ContentInner>
        </ContentWrap>
      </Layout>
    </ShellLayout>
  );
};

export default AppLayout;
