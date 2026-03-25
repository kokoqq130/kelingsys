import {
  ClockCircleOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  FundOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  MenuOutlined,
  ProfileOutlined,
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

  @media (max-width: 768px) {
    padding: 22px 18px 18px;

    &::before {
      top: -54px;
      right: -24px;
      width: 128px;
      height: 128px;
    }

    &::after {
      bottom: -56px;
      left: -24px;
      width: 112px;
      height: 112px;
    }
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

  @media (max-width: 768px) {
    gap: 14px;
    padding: 16px;
    border-radius: 22px;
  }
`;

const HeaderBar = styled(Header)`
  height: auto;
  padding: 20px 20px 0;
  line-height: normal;
  background: transparent;

  @media (max-width: 768px) {
    padding: 14px 14px 0;
  }
`;

const ContentWrap = styled(Content)`
  padding: 20px;

  @media (max-width: 768px) {
    padding: 14px;
  }
`;

const ContentInner = styled.div`
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 18px 18px 22px;

  @media (max-width: 768px) {
    padding: 14px 16px 18px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 14px;
  }
`;

const HeaderMain = styled.div`
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 16px;

  @media (max-width: 768px) {
    width: 100%;
    gap: 12px;
  }
`;

const HeaderCopy = styled.div`
  min-width: 0;
`;

const HeaderTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">总览</Link> },
  { key: '/timeline', icon: <ClockCircleOutlined />, label: <Link to="/timeline">时间线</Link> },
  { key: '/medications', icon: <MedicineBoxOutlined />, label: <Link to="/medications">用药变化</Link> },
  { key: '/admissions', icon: <ProfileOutlined />, label: <Link to="/admissions">住院周期</Link> },
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
          资料总览与回溯
        </Typography.Text>
        <Typography.Title level={3} style={{ color: '#ffffff', margin: '10px 0 8px' }}>
          柯灵资料查询系统
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(240,253,244,0.82)', marginBottom: 16 }}>
          以医生沟通、病程回顾和原始资料核对为主，尽量让信息查找更直接。
        </Typography.Paragraph>
        <Space wrap size={[8, 8]}>
          <Tag bordered={false} color="success">
            总览清楚
          </Tag>
          <Tag bordered={false} color="processing">
            回顾方便
          </Tag>
          <Tag bordered={false} color="warning">
            原始资料可追溯
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
          常用入口
        </Typography.Text>
        <Typography.Paragraph style={{ marginBottom: 8, color: 'rgba(6, 95, 70, 0.7)' }}>
          可以先看总览和住院周期，再去时间线、文档资料或原始文件确认细节。
        </Typography.Paragraph>
        <Space wrap size={[8, 8]}>
          <Tag bordered={false}>住院周期</Tag>
          <Tag bordered={false}>文档资料</Tag>
          <Tag bordered={false}>原始文件</Tag>
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
          width={292}
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
            <HeaderContent>
              <HeaderMain>
                {isMobile ? (
                  <Button
                    icon={<MenuOutlined />}
                    shape="circle"
                    onClick={() => setDrawerOpen(true)}
                  />
                ) : null}
                <HeaderCopy>
                  <Typography.Text
                    style={{
                      color: 'rgba(21, 128, 61, 0.9)',
                      letterSpacing: isMobile ? 1.2 : 1.6,
                      fontSize: isMobile ? 12 : undefined,
                    }}
                  >
                    病情整理台
                  </Typography.Text>
                  <Typography.Title level={isMobile ? 4 : 2} style={{ margin: '8px 0 8px' }}>
                    资料总览与病程回顾
                  </Typography.Title>
                  <Typography.Paragraph
                    style={{
                      marginBottom: 0,
                      maxWidth: 760,
                      fontSize: isMobile ? 14 : undefined,
                      lineHeight: isMobile ? 1.65 : undefined,
                    }}
                  >
                    可以集中查看主要情况、发作与住院经过、用药变化，以及每条结论对应的原始资料。
                  </Typography.Paragraph>
                </HeaderCopy>
              </HeaderMain>
              {!isMobile ? (
                <HeaderTags>
                  <Tag bordered={false} color="success">
                    近期情况
                  </Tag>
                  <Tag bordered={false} color="processing">
                    用药变化
                  </Tag>
                  <Tag bordered={false} color="warning">
                    原始资料
                  </Tag>
                </HeaderTags>
              ) : null}
            </HeaderContent>
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
