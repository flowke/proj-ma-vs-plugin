import React from 'react';
import { ConfigProvider, message } from 'antd';

interface AppProps {
  children: React.ReactNode;
}

export default function App({ children }: AppProps) {
  // 配置全局 message 的 maxCount
  React.useEffect(() => {
    message.config({
      maxCount: 1,
    });
  }, []);

  return (
    <>
      {/* 全局样式覆盖，确保 VS Code 主题生效 */}
      <style>{`
        .ant-input {
          background-color: var(--vscode-input-background) !important;
          border-color: var(--vscode-input-border) !important;
          color: var(--vscode-input-foreground) !important;
        }
        
        .ant-input::placeholder {
          color: var(--vscode-descriptionForeground) !important;
          opacity: 0.8;
        }
        
        .ant-input:focus {
          border-color: var(--vscode-focusBorder) !important;
          box-shadow: none !important;
        }
        
        .ant-input:hover {
          border-color: var(--vscode-focusBorder) !important;
        }
        
        .ant-form-item-label > label {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-content {
          background-color: var(--vscode-editor-background) !important;
        }
        
        .ant-modal-header {
          background-color: var(--vscode-editor-background) !important;
        }
        
        .ant-modal-title {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-close {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-close:hover {
          background-color: var(--vscode-list-hoverBackground) !important;
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-close-x {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-btn-default {
          background-color: var(--vscode-button-secondaryBackground) !important;
          border-color: var(--vscode-button-border) !important;
          color: var(--vscode-button-secondaryForeground) !important;
        }
        
        .ant-btn-primary {
          background-color: var(--vscode-button-background) !important;
          border-color: var(--vscode-button-border) !important;
          color: var(--vscode-button-foreground) !important;
        }
        
        .ant-btn-default:hover,
        .ant-btn-primary:hover {
          opacity: 0.9;
        }
      `}</style>
      <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'var(--vscode-button-background)',
          colorBgContainer: 'var(--vscode-sideBar-background)',
          colorText: 'var(--vscode-foreground)',
          colorBorder: 'transparent',
          colorSplit: 'transparent',
        },
        components: {
          Layout: {
            colorBgContainer: 'var(--vscode-sideBar-background)',
          },
          Collapse: {
            headerBg: 'transparent',
            contentBg: 'transparent',
            borderRadiusLG: 0,
            headerPadding: '8px 0',
            contentPadding: '0 0 8px 0',
          },
          List: {
            itemPadding: '2px 0',
          },
          Input: {
            colorBgContainer: 'var(--vscode-input-background)',
            colorBorder: 'var(--vscode-input-border)',
            colorText: 'var(--vscode-input-foreground)',
            colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
            activeBorderColor: 'var(--vscode-focusBorder)',
            hoverBorderColor: 'var(--vscode-input-border)',
            activeShadow: 'none',
            boxShadow: 'none',
          },
          Form: {
            labelColor: 'var(--vscode-foreground)',
            labelRequiredMarkColor: 'var(--vscode-errorForeground)',
          },
          Modal: {
            contentBg: 'var(--vscode-editor-background)',
            headerBg: 'var(--vscode-editor-background)',
            titleColor: 'var(--vscode-foreground)',
            colorIcon: 'var(--vscode-foreground)',
            colorIconHover: 'var(--vscode-foreground)',
          },
          Button: {
            colorText: 'var(--vscode-button-foreground)',
            colorBgContainer: 'var(--vscode-button-background)',
            colorBorder: 'var(--vscode-button-border)',
            colorPrimary: 'var(--vscode-button-background)',
            colorPrimaryText: 'var(--vscode-button-foreground)',
            colorTextDisabled: 'var(--vscode-disabledForeground)',
          },
        },
      }}
      >
        {children}
      </ConfigProvider>
    </>
  );
}
