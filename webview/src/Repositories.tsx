import React, { useEffect, useState } from 'react';
import { Button, Layout, List, Modal, Form, Input, message, Tag } from 'antd';
import { DeleteOutlined, LinkOutlined, GithubOutlined, GitlabOutlined, CodeOutlined } from '@ant-design/icons';
import type { RepositoryItem, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import Header from './Header';

const { Content } = Layout;

export default function Repositories() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      
      if (msg?.type === 'configLoaded' && msg.payload) {
        setConfig(msg.payload);
      }
    };
    
    window.addEventListener('message', handler);
    
    // 请求加载配置
    try {
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Repositories] failed to send loadConfig', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAddRepository = () => {
    setShowAddModal(true);
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    form.resetFields();
  };

  const extractRepoInfo = (url: string): {name: string; provider: 'github' | 'gitlab' | 'bitbucket' | 'other'} => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      let provider: 'github' | 'gitlab' | 'bitbucket' | 'other' = 'other';
      if (hostname.includes('github.com')) {
        provider = 'github';
      } else if (hostname.includes('gitlab.com') || hostname.includes('gitlab.')) {
        provider = 'gitlab';
      } else if (hostname.includes('bitbucket.org')) {
        provider = 'bitbucket';
      }

      // 提取仓库名称
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      let name = url;
      
      if (pathParts.length >= 2) {
        // 通常格式是 /username/reponame
        name = pathParts[1];
        // 去除 .git 后缀
        if (name.endsWith('.git')) {
          name = name.slice(0, -4);
        }
      } else if (pathParts.length === 1) {
        name = pathParts[0];
      }

      return { name, provider };
    } catch (error) {
      console.error('Error extracting repo info:', error);
      return { name: url, provider: 'other' };
    }
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

      // 提取仓库信息
      const { name, provider } = extractRepoInfo(url);

      const newRepository: RepositoryItem = {
        id: Date.now().toString(),
        name,
        url,
        provider,
        addedAt: new Date().toISOString(),
      };

      const updatedConfig = {
        ...config,
        repositories: [...(config.repositories || []), newRepository],
      };

      setConfig(updatedConfig);
      postMessage({ type: 'saveConfig', payload: updatedConfig });
      
      message.success('仓库添加成功');
      setShowAddModal(false);
      form.resetFields();
    } catch (error) {
      console.error('Error adding repository:', error);
      message.error('添加仓库失败，请检查 URL 格式');
      setShowAddModal(false);
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepository = (repoId: string) => {
    const updatedConfig = {
      ...config,
      repositories: (config.repositories || []).filter(repo => repo.id !== repoId),
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success('仓库删除成功');
  };

  const handleOpenRepository = (url: string) => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      message.warning('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    
    // 在默认浏览器中打开链接
    postMessage({ type: 'openUrl', payload: { url } });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'github':
        return <GithubOutlined style={{ fontSize: '16px', color: '#24292e' }} />;
      case 'gitlab':
        return <GitlabOutlined style={{ fontSize: '16px', color: '#fc6d26' }} />;
      case 'bitbucket':
        return <CodeOutlined style={{ fontSize: '16px', color: '#0052cc' }} />;
      default:
        return <CodeOutlined style={{ fontSize: '16px', color: 'var(--vscode-symbolIcon-fileForeground)' }} />;
    }
  };

  const getProviderTag = (provider: string) => {
    const colors = {
      github: '#24292e',
      gitlab: '#fc6d26', 
      bitbucket: '#0052cc',
      other: 'var(--vscode-badge-background)',
    };

    return (
      <Tag 
        style={{ 
          fontSize: '10px',
          padding: '0 4px',
          margin: 0,
          border: 'none',
          backgroundColor: colors[provider as keyof typeof colors] || colors.other,
          color: provider === 'other' ? 'var(--vscode-badge-foreground)' : '#fff',
        }}
      >
        {provider.toUpperCase()}
      </Tag>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--vscode-sideBar-background)' }}>
      <Header onRepoAdd={handleAddRepository} />
      
      <Content style={{ padding: '8px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ 
            color: 'var(--vscode-foreground)', 
            margin: '0 0 8px 0', 
            fontSize: '14px',
            fontWeight: 500,
          }}>
            仓库 ({(config.repositories || []).length})
          </h3>
        </div>

        {(config.repositories || []).length > 0 ? (
          <List
            size="small"
            dataSource={config.repositories || []}
            renderItem={(repo) => (
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
                  {/* 提供商图标 */}
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {getProviderIcon(repo.provider || 'other')}
                  </div>

                  {/* 仓库信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <div 
                        style={{ 
                          color: 'var(--vscode-foreground)',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          lineHeight: '1.2',
                        }}
                        onClick={() => handleOpenRepository(repo.url)}
                        title={repo.name}
                      >
                        {repo.name}
                      </div>
                      {getProviderTag(repo.provider || 'other')}
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
                    onClick={() => handleOpenRepository(repo.url)}
                    title={repo.url}
                    >
                      {repo.url}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => handleOpenRepository(repo.url)}
                      style={{
                        color: 'var(--vscode-foreground)',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        fontSize: '12px',
                      }}
                      title="打开仓库"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteRepository(repo.id)}
                      style={{
                        color: 'var(--vscode-errorForeground)',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        fontSize: '12px',
                      }}
                      title="删除仓库"
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
            暂无仓库，点击右上角 + 号添加
          </div>
        )}
      </Content>

      {/* 添加仓库模态框 */}
      <Modal
        title="添加仓库"
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
          <span style={{ 
            color: 'var(--vscode-foreground)',
            fontSize: '14px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}>
            ✕
          </span>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitAdd}
          style={{ margin: 0 }}
        >
          <Form.Item
            label={<span style={{ fontSize: '13px' }}>仓库地址</span>}
            name="url"
            rules={[
              { required: true, message: '请输入仓库地址' },
              { type: 'url', message: '请输入有效的仓库地址' },
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input
              placeholder="https://github.com/username/repository"
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
              添加
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
