import React, { useEffect, useState } from 'react';
import { Button, Layout, List, Modal, Form, Input, message, Spin } from 'antd';
import { DeleteOutlined, LinkOutlined, GlobalOutlined } from '@ant-design/icons';
import type { BookmarkItem, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import Header from './Header';

const { Content } = Layout;

export default function Bookmarks() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      console.log('[Bookmarks] received message:', msg);
      
      if (msg?.type === 'configLoaded' && msg.payload) {
        console.log('[Bookmarks] configLoaded:', msg.payload);
        setConfig(msg.payload);
      }
      
      if (msg?.type === 'bookmarkAdded' && msg.payload) {
        console.log('[Bookmarks] bookmarkAdded:', msg.payload);
        const { success, error } = msg.payload;
        
        setLoading(false);
        
        if (success) {
          message.success('书签添加成功');
          setShowAddModal(false);
          form.resetFields();
        } else {
          message.error(error || '添加书签失败');
          // 失败时也要关闭弹窗
          setShowAddModal(false);
          form.resetFields();
        }
      }
    };
    
    window.addEventListener('message', handler);
    
    // 请求加载配置
    try {
      console.log('[Bookmarks] sending loadConfig');
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Bookmarks] failed to send loadConfig', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAddBookmark = () => {
    setShowAddModal(true);
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setLoading(false);
    form.resetFields();
  };


  const handleSubmitAdd = async (values: { url: string }) => {
    setLoading(true);
    try {
      let { url } = values;
      
      // 确保 URL 有协议
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // 验证 URL 格式
      new URL(url);

      // 发送消息到扩展端创建书签
      console.log('[Bookmarks] Requesting bookmark creation for:', url);
      postMessage({ 
        type: 'addBookmark', 
        payload: { url } 
      });

      // loading状态会在收到bookmarkAdded消息后关闭
    } catch (error) {
      console.error('Error processing URL:', error);
      message.error('URL 格式无效');
      setLoading(false);
    }
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    const updatedConfig = {
      ...config,
      bookmarks: (config.bookmarks || []).filter(bookmark => bookmark.id !== bookmarkId),
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success('书签删除成功');
  };

  const handleOpenBookmark = (url: string) => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      message.warning('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    
    // 在默认浏览器中打开链接
    postMessage({ type: 'openUrl', payload: { url } });
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--vscode-sideBar-background)' }}>
      <Header onBookmarkAdd={handleAddBookmark} />
      
      <Content style={{ padding: '8px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ 
            color: 'var(--vscode-foreground)', 
            margin: '0 0 8px 0', 
            fontSize: '14px',
            fontWeight: 500,
          }}>
            书签 ({(config.bookmarks || []).length})
          </h3>
        </div>

        {(config.bookmarks || []).length > 0 ? (
          <List
            size="small"
            dataSource={config.bookmarks || []}
            renderItem={(bookmark) => (
              <List.Item style={{ 
                border: 'none', 
                padding: '8px 0',
                borderBottom: '1px solid var(--vscode-panel-border)',
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  width: '100%',
                }}>
                  {/* 网站图标 */}
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {bookmark.icon ? (
                      <img
                        src={bookmark.icon}
                        alt=""
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          borderRadius: '2px',
                        }}
                        onError={(e) => {
                          // 如果图标加载失败，显示默认图标
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'block';
                          }
                        }}
                      />
                    ) : null}
                    <GlobalOutlined 
                      style={{ 
                        fontSize: '16px', 
                        color: 'var(--vscode-symbolIcon-fileForeground)',
                        display: bookmark.icon ? 'none' : 'block',
                      }} 
                    />
                  </div>

                  {/* 书签信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      style={{ 
                        color: 'var(--vscode-foreground)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        lineHeight: '1.2',
                        marginBottom: '2px',
                      }}
                      onClick={() => handleOpenBookmark(bookmark.url)}
                      title={bookmark.title}
                    >
                      {bookmark.title}
                    </div>
                    <div style={{ 
                      color: 'var(--vscode-descriptionForeground)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleOpenBookmark(bookmark.url)}
                    title={bookmark.url}
                    >
                      {bookmark.url}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => handleOpenBookmark(bookmark.url)}
                      style={{
                        color: 'var(--vscode-foreground)',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        fontSize: '12px',
                      }}
                      title="打开链接"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      style={{
                        color: 'var(--vscode-errorForeground)',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        fontSize: '12px',
                      }}
                      title="删除书签"
                    />
                  </div>
                </div>
              </List.Item>
            )}
            style={{ padding: 0 }}
          />
        ) : (
          <div style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            fontSize: '12px',
            padding: '20px 0',
            textAlign: 'center',
          }}>
            暂无书签，点击右上角 + 号添加
          </div>
        )}
      </Content>

      {/* 添加书签模态框 */}
      <Modal
        title="添加书签"
        open={showAddModal}
        onCancel={handleCancelAdd}
        footer={null}
        width={400}
        style={{ top: 60 }}
        styles={{
          header: {
            borderBottom: '1px solid var(--vscode-panel-border)',
            padding: '12px 16px',
          },
          body: {
            padding: '16px 0',
          },
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          },
        }}
        closeIcon={
          <span style={{ fontSize: '14px' }}>✕</span>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitAdd}
          style={{ margin: 0 }}
        >
          <Form.Item
            label={<span style={{ fontSize: '13px' }}>网页地址</span>}
            name="url"
            rules={[
              { required: true, message: '请输入网页地址' },
              { type: 'url', message: '请输入有效的网页地址' },
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input
              placeholder="https://example.com"
              style={{ fontSize: '13px' }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              onClick={handleCancelAdd}
              style={{ fontSize: '13px' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ fontSize: '13px' }}
            >
              {loading ? '创建书签中...' : '添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
