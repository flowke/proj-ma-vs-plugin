import React, { useEffect, useState } from 'react';
import { Button, Collapse, Layout, List } from 'antd';
import { PlusOutlined, SettingOutlined, StarOutlined, StarFilled, ReloadOutlined, BarsOutlined, CodeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import type { AddedDirectory, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';

const { Content } = Layout;

export default function Home() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const navigate = useNavigate();


  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      console.log('[Webview] received message:', message);
      
      if (message?.type === 'helloFromExtension') {
        console.log('[Webview] helloFromExtension received');
      }
      
      if (message?.type === 'configLoaded' && message.payload) {
        console.log('[Webview] configLoaded:', message.payload);
        setConfig(message.payload);
      }
      
      if (message?.type === 'pickedFolder' && message.payload) {
        const payload = message.payload as {
          uri: string;
          name: string;
          subfolders: any[];
        };
        console.log('[Webview] pickedFolder payload:', payload);
        
        const newDirectory: AddedDirectory = {
          id: payload.uri,
          name: payload.name,
          uri: payload.uri,
          subfolders: payload.subfolders.map((sf: any) => ({
            ...sf,
            isFavorite: false,
          })),
          addedAt: new Date().toISOString(),
        };
        
        setConfig((prev) => {
          if (prev.addedDirectories.some((d) => d.uri === payload.uri)) return prev;
          const updated = {
            ...prev,
            addedDirectories: [...prev.addedDirectories, newDirectory],
          };
          // 保存配置到文件
          postMessage({ type: 'saveConfig', payload: updated });
          return updated;
        });
      }
      
      if (message?.type === 'directoryRefreshed' && message.payload) {
        const payload = message.payload as {
          uri: string;
          subfolders: any[];
        };
        console.log('[Webview] directoryRefreshed payload:', payload);
        
        setConfig((prev) => {
          const updated = {
            ...prev,
            addedDirectories: prev.addedDirectories.map((dir) => {
              if (dir.uri === payload.uri) {
                // 保持已收藏的状态，为新的子文件夹设置未收藏状态
                const existingFavorites = new Set(
                  dir.subfolders.filter(sf => sf.isFavorite).map(sf => sf.uri)
                );
                
                const updatedSubfolders = payload.subfolders.map((sf: any) => ({
                  ...sf,
                  isFavorite: existingFavorites.has(sf.uri) || false,
                }));
                
                return {
                  ...dir,
                  subfolders: updatedSubfolders,
                };
              }
              return dir;
            }),
          };
          // 保存配置到文件
          postMessage({ type: 'saveConfig', payload: updated });
          return updated;
        });
      }
    };
    
    window.addEventListener('message', handler);
    
    // 握手：Webview 启动后告知扩展端自己已就绪，并请求加载配置
    try {
      console.log('[Webview] sending webviewReady');
      postMessage({ type: 'webviewReady' });
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Webview] failed to send webviewReady', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAdd = () => {
    console.log('[Webview] handleAdd clicked');
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    console.log('[Webview] postMessage: pickFolder');
    postMessage({ type: 'pickFolder' });
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleToggleFavorite = (directoryId: string, subfolderUri: string) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        addedDirectories: prev.addedDirectories.map((dir) =>
          dir.id === directoryId 
            ? {
                ...dir,
                subfolders: dir.subfolders.map((sf) =>
                  sf.uri === subfolderUri 
                    ? { ...sf, isFavorite: !sf.isFavorite }
                    : sf
                ),
              }
            : dir
        ),
      };
      // 保存配置到文件
      postMessage({ type: 'saveConfig', payload: updated });
      return updated;
    });
  };

  // 处理收藏列表中的取消收藏
  const handleRemoveFavorite = (subfolderUri: string) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        addedDirectories: prev.addedDirectories.map((dir) => ({
          ...dir,
          subfolders: dir.subfolders.map((sf) =>
            sf.uri === subfolderUri 
              ? { ...sf, isFavorite: false }
              : sf
          ),
        })),
      };
      // 保存配置到文件
      postMessage({ type: 'saveConfig', payload: updated });
      return updated;
    });
  };

  const handleRefreshDirectory = (directoryUri: string) => {
    console.log('[Webview] handleRefreshDirectory clicked for:', directoryUri);
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    console.log('[Webview] postMessage: refreshDirectory');
    postMessage({ type: 'refreshDirectory', payload: { uri: directoryUri } });
  };

  const handleOpenTerminal = (directoryUri: string) => {
    console.log('[Webview] handleOpenTerminal clicked for:', directoryUri);
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    console.log('[Webview] postMessage: openTerminal');
    postMessage({ type: 'openTerminal', payload: { uri: directoryUri } });
  };

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setDragOverIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 只有当拖拽到不同位置时才设置悬停状态
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 只有当鼠标真正离开容器时才清除悬停状态
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    // 重置所有拖拽状态
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const updatedDirectories = [...config.addedDirectories];
    const draggedItem = updatedDirectories[draggedIndex];
    
    // 移除拖拽的项目
    updatedDirectories.splice(draggedIndex, 1);
    
    // 在新位置插入
    updatedDirectories.splice(dropIndex, 0, draggedItem);

    const updated = {
      ...config,
      addedDirectories: updatedDirectories,
    };

    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    // 清理所有拖拽状态
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 获取所有收藏的子文件夹
  const getFavoriteSubfolders = () => {
    const favorites: Array<{ name: string; uri: string; parentName: string }> = [];
    config.addedDirectories.forEach((dir) => {
      dir.subfolders.forEach((sf) => {
        if (sf.isFavorite) {
          favorites.push({
            name: sf.name,
            uri: sf.uri,
            parentName: dir.name,
          });
        }
      });
    });
    return favorites;
  };

  const favoriteSubfolders = getFavoriteSubfolders();


  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--vscode-panel-background)' }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        .drag-item-being-dragged {
          opacity: 0.5 !important;
        }
        
        .drag-item-drop-target {
          background-color: var(--vscode-list-hoverBackground) !important;
          border: 2px dashed var(--vscode-focusBorder) !important;
          border-radius: 6px !important;
          transition: none !important;
        }
        
        .drag-item-being-dragged .ant-collapse-content,
        .drag-item-being-dragged .ant-collapse-header {
          opacity: 0.5 !important;
        }
        
        .drag-item-drop-target .ant-collapse-content,
        .drag-item-drop-target .ant-collapse-header {
          background-color: var(--vscode-list-hoverBackground) !important;
        }
        
        /* 缩小折叠面板内容间距 */
        .ant-collapse-content > .ant-collapse-content-box {
          padding-top: 4px !important;
        }
        
        /* 修改折叠面板标题右边距 */
        .ant-collapse-header {
          padding-right: 4px !important;
          padding: 8px 4px !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 4px', gap: '4px' }}>
        <Button 
          type="text" 
          size="small"
          icon={<PlusOutlined />} 
          onClick={handleAdd}
          style={{
            width: '20px',
            height: '20px',
            minWidth: '20px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--vscode-foreground)',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '12px',
          }}
        />
        <Button 
          type="text" 
          size="small"
          icon={<SettingOutlined />} 
          onClick={handleSettings}
          style={{
            width: '20px',
            height: '20px',
            minWidth: '20px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--vscode-foreground)',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '12px',
          }}
        />
      </div>
      <Content style={{ padding: '4px 0' }}>
        <div className="drag-container">
          {/* 收藏区域 */}
          <div className="drag-item">
            <Collapse 
              size="small"
              ghost
              bordered={false}
              defaultActiveKey={['favorites']}
            >
              <Collapse.Panel 
                key="favorites" 
                header={
                  <span style={{ color: 'var(--vscode-foreground)' }}>
                    ⭐ 收藏 ({favoriteSubfolders.length})
                  </span>
                }
              >
                {favoriteSubfolders.length > 0 ? (
                  <List
                    size="small"
                    dataSource={favoriteSubfolders}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Button
                            type="text"
                            size="small"
                            icon={<StarFilled />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(item.uri);
                            }}
                            style={{
                              color: '#ffd700',
                              padding: '0',
                              width: '20px',
                              height: '20px',
                              minWidth: '20px',
                              fontSize: '14px',
                            }}
                            title="取消收藏"
                          />
                          <span style={{ color: 'var(--vscode-foreground)' }}>
                            {item.name}
                          </span>
                        </div>
                      </List.Item>
                    )}
                    style={{ padding: 0 }}
                  />
                ) : (
                  <div style={{ 
                    color: 'var(--vscode-descriptionForeground)', 
                    fontSize: '12px',
                    padding: '8px 0',
                    textAlign: 'center',
                  }}>
                    暂无收藏的文件夹
                  </div>
                )}
              </Collapse.Panel>
            </Collapse>
          </div>

          {/* 可拖拽的目录项 */}
          {config.addedDirectories.map((f, index) => (
            <div 
              key={f.id}
              className={`drag-item ${draggedIndex === index ? 'drag-item-being-dragged' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'drag-item-drop-target' : ''}`}
              style={{
                margin: '4px 0',
              }}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={(e) => handleDragLeave(e)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <Collapse 
                size="small"
                ghost
                bordered={false}
              >
                <Collapse.Panel 
                  key={f.id}
                  header={
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ 
                          color: 'var(--vscode-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          lineHeight: '20px',
                          height: '20px'
                        }}>{f.name}</span>
                        <Button
                          type="text"
                          size="small"
                          icon={<CodeOutlined style={{ fontSize: '14px' }}/>}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTerminal(f.uri);
                          }}
                          style={{
                            color: 'var(--vscode-foreground)',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="在此目录打开终端"
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<ReloadOutlined style={{ fontSize: '10px' }}/>}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshDirectory(f.uri);
                          }}
                          style={{
                            color: 'var(--vscode-foreground)',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="刷新目录"
                        />
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          style={{
                            color: 'var(--vscode-foreground)',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: draggedIndex === index ? 'grabbing' : 'grab',
                            opacity: draggedIndex === index ? 1 : 0.7,
                            transition: 'opacity 0.2s ease',
                            filter: draggedIndex === index ? 'brightness(1.2)' : 'none',
                          }}
                          title="拖拽排序"
                          onMouseEnter={(e) => {
                            if (draggedIndex !== index) {
                              e.currentTarget.style.opacity = '1';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (draggedIndex !== index) {
                              e.currentTarget.style.opacity = '0.7';
                            }
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.cursor = 'grabbing';
                          }}
                          onMouseUp={(e) => {
                            if (draggedIndex !== index) {
                              e.currentTarget.style.cursor = 'grab';
                            }
                          }}
                        >
                          <BarsOutlined style={{ fontSize: '14px' }}/>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <List
                    size="small"
                    dataSource={f.subfolders}
                    renderItem={(sf) => (
                      <List.Item style={{ border: 'none', padding: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Button
                            type="text"
                            size="small"
                            icon={sf.isFavorite ? <StarFilled /> : <StarOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(f.id, sf.uri);
                            }}
                            style={{
                              color: sf.isFavorite ? '#ffd700' : 'var(--vscode-foreground)',
                              padding: '0',
                              width: '20px',
                              height: '20px',
                              minWidth: '20px',
                              fontSize: '14px',
                            }}
                          />
                          <span style={{ color: 'var(--vscode-foreground)' }}>{sf.name}</span>
                        </div>
                      </List.Item>
                    )}
                    style={{ padding: 0 }}
                  />
                </Collapse.Panel>
              </Collapse>
            </div>
          ))}
        </div>
      </Content>
    </Layout>
  );
}
