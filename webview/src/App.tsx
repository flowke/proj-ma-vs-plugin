import React, { useEffect, useMemo, useState } from 'react';
import { Button, Collapse, ConfigProvider, Layout, List } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

type VSCodeApi = { postMessage: (message: any) => void } | undefined;
const { Content } = Layout;

type Subfolder = { name: string; uri: string };
type FolderEntry = { id: string; name: string; uri: string; subfolders: Subfolder[] };

export default function App() {
  const [folders, setFolders] = useState<FolderEntry[]>([]);

  const vscode: VSCodeApi = useMemo(() => {
    try {
      const anyWindow = window as any;
      return typeof anyWindow.acquireVsCodeApi === 'function'
        ? anyWindow.acquireVsCodeApi()
        : undefined;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      console.log('[Webview] received message:', message);
      if (message?.type === 'helloFromExtension') {
        console.log('[Webview] helloFromExtension received');
      }
      if (message?.type === 'pickedFolder' && message.payload) {
        const payload = message.payload as {
          uri: string;
          name: string;
          subfolders: Subfolder[];
        };
        console.log('[Webview] pickedFolder payload:', payload);
        setFolders((prev) => {
          if (prev.some((f) => f.uri === payload.uri)) return prev;
          return [
            ...prev,
            {
              id: payload.uri,
              name: payload.name,
              uri: payload.uri,
              subfolders: payload.subfolders,
            },
          ];
        });
      }
    };
    window.addEventListener('message', handler);
    // 握手：Webview 启动后告知扩展端自己已就绪
    try {
      console.log('[Webview] sending webviewReady');
      (window as any)?.acquireVsCodeApi?.()?.postMessage?.({ type: 'webviewReady' });
    } catch (e) {
      console.warn('[Webview] failed to send webviewReady', e);
    }
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAdd = () => {
    console.log('[Webview] handleAdd clicked, vscodeApi?', Boolean(vscode));
    if (!vscode) {
      console.warn('VS Code API 不可用');
      return;
    }
    console.log('[Webview] postMessage: pickFolder');
    console.log(vscode,vscode.postMessage);
    
    vscode.postMessage({ type: 'pickFolder' });
    // 发送一条测试消息，侧边栏应弹出信息框
    vscode.postMessage({ command: 'alert', text: '加号按钮已点击（来自 Webview）' });
  };

  const items = folders.map((f) => ({
    key: f.id,
    label: f.name,
    children: (
      <List
        size="small"
        dataSource={f.subfolders}
        renderItem={(sf) => <List.Item>{sf.name}</List.Item>}
      />
    ),
  }));

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh', backgroundColor: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 8px 0 8px' }}>
          <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={handleAdd} />
        </div>
        <Content style={{ padding: 12 }}>
          <Collapse items={items} />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
