import React from 'react';
import { ConfigProvider } from 'antd';

interface AppProps {
  children: React.ReactNode;
}

export default function App({ children }: AppProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'var(--vscode-button-background)',
          colorBgContainer: 'var(--vscode-panel-background)',
          colorText: 'var(--vscode-foreground)',
          colorBorder: 'transparent',
          colorSplit: 'transparent',
        },
        components: {
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
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
