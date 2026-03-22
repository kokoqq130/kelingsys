import {
  ClockCircleOutlined,
  FileTextOutlined,
  FundOutlined,
  HomeOutlined,
  MenuOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Grid, Layout, Menu, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const ShellLayout = styled(Layout)`
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(236, 245, 255, 0.95), transparent 28%),
    linear-gradient(180deg, #f7faf7 0%, #eef4ef 100%);
`;

const BrandBlock = styled.div`
  padding: 20px 18px;
  color: #f5f8ff;
  background: linear-gradient(180deg, #183153 0%, #13263d 100%);
`;

const HeaderBar = styled(Header)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: auto;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(19, 38, 61, 0.08);
  backdrop-filter: blur(12px);
`;

const ContentWrap = styled(Content)`
  padding: 20px;
`;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">总览</Link> },
  { key: '/timeline', icon: <ClockCircleOutlined />, label: <Link to="/timeline">时间线</Link> },
  { key: '/labs', icon: <FundOutlined />, label: <Link to="/labs">检查结果</Link> },
  { key: '/documents', icon: <FileTextOutlined />, label: <Link to="/documents">文档资料</Link> },
  { key: '/search', icon: <SearchOutlined />, label: <Link to="/search">搜索</Link> },
];

const AppLayout = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  const menu = (
    <>
      <BrandBlock>
        <Typography.Text style={{ color: '#9ec5ff', fontSize: 12, letterSpacing: 2 }}>
          KELING QUERY
        </Typography.Text>
        <Typography.Title level={4} style={{ color: '#ffffff', margin: '8px 0 6px' }}>
          柯灵资料查询系统
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(245,248,255,0.72)', margin: 0 }}>
          以查询、回溯和医生沟通准备为主。
        </Typography.Paragraph>
      </BrandBlock>
      <Menu
        mode="inline"
        items={menuItems}
        selectedKeys={selectedKeys}
        onClick={() => setDrawerOpen(false)}
        style={{ borderInlineEnd: 'none', paddingTop: 12 }}
      />
    </>
  );

  return (
    <ShellLayout>
      {!isMobile ? (
        <Sider width={280} theme="light" style={{ borderRight: '1px solid rgba(19, 38, 61, 0.08)' }}>
          {menu}
        </Sider>
      ) : (
        <Drawer
          placement="left"
          width={280}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          bodyStyle={{ padding: 0 }}
        >
          {menu}
        </Drawer>
      )}
      <Layout>
        <HeaderBar>
          <Space align="center" size={12}>
            {isMobile ? (
              <Button icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
            ) : null}
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                查询优先的资料工作台
              </Typography.Title>
              <Typography.Text type="secondary">
                已接入真实资料索引，下一步继续补图表和细节联调。
              </Typography.Text>
            </div>
          </Space>
        </HeaderBar>
        <ContentWrap>
          <Outlet />
        </ContentWrap>
      </Layout>
    </ShellLayout>
  );
};

export default AppLayout;
