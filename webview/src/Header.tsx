import React from 'react';
import { Button } from 'antd';
import { HomeOutlined, BookOutlined, CodeOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router';

interface Tab {
  key: string;
  icon: React.ReactNode;
  label?: string;
  path: string;
  showAdd?: boolean;
  onAdd?: () => void;
}

interface HeaderProps {
  onBookmarkAdd?: () => void;
  onRepoAdd?: () => void;
  onFolderAdd?: () => void;
}

export default function Header({ onBookmarkAdd, onRepoAdd, onFolderAdd }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs: Tab[] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      path: '/',
      showAdd: true,
      onAdd: onFolderAdd,
    },
    {
      key: 'bookmarks', 
      icon: <BookOutlined />,
      label: '书签',
      path: '/bookmarks',
      showAdd: true,
      onAdd: onBookmarkAdd,
    },
    {
      key: 'repos',
      icon: <CodeOutlined />,
      label: '仓库', 
      path: '/repos',
      showAdd: true,
      onAdd: onRepoAdd,
    },
  ];

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const currentTab = tabs.find(tab => tab.path === location.pathname);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '4px 8px',
      borderBottom: '1px solid var(--vscode-panel-border)',
      backgroundColor: 'var(--vscode-sideBar-background)',
    }}>
      {/* Tab 导航 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Button
              key={tab.key}
              type="text"
              size="small"
              icon={tab.icon}
              onClick={() => handleTabClick(tab.path)}
              style={{
                height: '28px',
                padding: '0 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: isActive 
                  ? 'var(--vscode-tab-activeForeground)' 
                  : 'var(--vscode-tab-inactiveForeground)',
                backgroundColor: isActive 
                  ? 'var(--vscode-list-activeSelectionBackground)' 
                  : 'transparent',
 
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {tab.label && <span>{tab.label}</span>}
            </Button>
          );
        })}
      </div>

      {/* 右侧按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* 当前tab的添加按钮 */}
        {currentTab?.showAdd && currentTab?.onAdd && (
          <Button 
            type="text" 
            size="small"
            icon={<PlusOutlined />} 
            onClick={currentTab.onAdd}
            style={{
              width: '24px',
              height: '24px',
              minWidth: '24px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vscode-foreground)',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '12px',
            }}
            title={`添加${currentTab.label}`}
          />
        )}
        
        {/* 设置按钮 */}
        <Button 
          type="text" 
          size="small"
          icon={<SettingOutlined />} 
          onClick={handleSettings}
          style={{
            width: '24px',
            height: '24px',
            minWidth: '24px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--vscode-foreground)',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '12px',
          }}
          title="设置"
        />
      </div>
    </div>
  );
}
