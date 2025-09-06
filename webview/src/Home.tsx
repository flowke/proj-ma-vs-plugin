import React, { useEffect, useState, useMemo } from 'react';
import { Button, Collapse, Layout, List, Modal, Form, Input, Select, Radio, message } from 'antd';
import { StarOutlined, StarFilled, ReloadOutlined, BarsOutlined, CodeOutlined, FolderOpenOutlined, DeleteOutlined, ReadOutlined, FolderOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { marked } from 'marked';
import type { AddedDirectory, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import Header from './Header';
import { MoreDropdown } from './components';
import { useClone } from './hooks/useClone';
import { parseRepositoryInput, validateRepositoryUrl } from './utils';

const { Content } = Layout;

export default function Home() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [pendingEditorAction, setPendingEditorAction] = useState<{ folderUri: string; folderName: string } | null>(null);
  const [favoritesExpanded, setFavoritesExpanded] = useState<boolean>(true);
  const [directoryExpandedStates, setDirectoryExpandedStates] = useState<Record<string, boolean>>({});
  const [showReadmeModal, setShowReadmeModal] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [currentReadmeInfo, setCurrentReadmeInfo] = useState<{ uri: string; name: string } | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneTargetDirectory, setCloneTargetDirectory] = useState<AddedDirectory | null>(null);
  const [cloneForm] = Form.useForm();
  const navigate = useNavigate();

  // 使用克隆 hook
  const { cloneState, cloneRepository, resetCloneState } = useClone(config.addedDirectories);

  // 配置 marked
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // 解析markdown内容
  const parsedMarkdown = useMemo(() => {
    if (!readmeContent) return '';
    try {
      return marked(readmeContent);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return readmeContent;
    }
  }, [readmeContent]);


  // Load favorites expanded state from localStorage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('home-favorites-expanded');
      if (savedState !== null) {
        setFavoritesExpanded(JSON.parse(savedState));
      }
    } catch (e) {
      console.warn('Failed to load favorites expanded state from localStorage:', e);
    }
  }, []);

  // Save favorites expanded state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('home-favorites-expanded', JSON.stringify(favoritesExpanded));
    } catch (e) {
      console.warn('Failed to save favorites expanded state to localStorage:', e);
    }
  }, [favoritesExpanded]);

  // Load directory expanded states from localStorage
  useEffect(() => {
    try {
      const savedStates = localStorage.getItem('home-directory-expanded-states');
      if (savedStates !== null) {
        setDirectoryExpandedStates(JSON.parse(savedStates));
      }
    } catch (e) {
      console.warn('Failed to load directory expanded states from localStorage:', e);
    }
  }, []);

  // Save directory expanded states to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('home-directory-expanded-states', JSON.stringify(directoryExpandedStates));
    } catch (e) {
      console.warn('Failed to save directory expanded states to localStorage:', e);
    }
  }, [directoryExpandedStates]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      
      if (message?.type === 'configLoaded' && message.payload) {
        setConfig(message.payload);
      }
      
      if (message?.type === 'pickedFolder' && message.payload) {
        const payload = message.payload as {
          uri: string;
          name: string;
          subfolders: any[];
        };
        
        const newDirectory: AddedDirectory = {
          id: payload.uri,
          name: payload.name,
          uri: payload.uri,
          subfolders: payload.subfolders.map((sf: any) => ({
            ...sf,
            isFavorite: false,
            hasReadme: sf.hasReadme || false,
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
                  hasReadme: sf.hasReadme || false,
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

      if (message?.type === 'readmeContentLoaded' && message.payload) {
        const payload = message.payload as {
          content: string;
          uri: string;
          name: string;
        };
        
        setReadmeContent(payload.content);
        setCurrentReadmeInfo({ uri: payload.uri, name: payload.name });
        setShowReadmeModal(true);
      }
    };
    
    window.addEventListener('message', handler);
    
    // 握手：Webview 启动后告知扩展端自己已就绪，并请求加载配置
    try {
      postMessage({ type: 'webviewReady' });
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Webview] failed to send webviewReady', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAdd = () => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    postMessage({ type: 'pickFolder' });
  };

  const handleBookmarkAdd = () => {
    navigate('/bookmarks');
  };

  const handleRepoAdd = () => {
    navigate('/repos');
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
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    postMessage({ type: 'refreshDirectory', payload: { uri: directoryUri } });
  };

  const handleOpenTerminal = (directoryUri: string) => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    postMessage({ type: 'openTerminal', payload: { uri: directoryUri } });
  };

  const handleOpenInFileManager = (folderUri: string) => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    postMessage({ type: 'openInFileManager', payload: { uri: folderUri } });
  };

  const handleOpenInEditor = (folderUri: string, folderName: string) => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }

    // 检查是否已设置默认编辑器
    if (config.settings.defaultEditor) {
      // 直接使用已设置的编辑器
      postMessage({ 
        type: 'openInEditor', 
        payload: { 
          uri: folderUri, 
          editor: config.settings.defaultEditor 
        } 
      });
    } else {
      // 显示编辑器选择模态框
      setPendingEditorAction({ folderUri, folderName });
      setShowEditorModal(true);
    }
  };

  const handleEditorSelection = (editor: 'vscode' | 'cursor') => {
    if (!pendingEditorAction) return;

    // 更新配置中的默认编辑器
    const updated = {
      ...config,
      settings: {
        ...config.settings,
        defaultEditor: editor,
      },
    };
    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });

    // 执行打开操作
    postMessage({ 
      type: 'openInEditor', 
      payload: { 
        uri: pendingEditorAction.folderUri, 
        editor: editor 
      } 
    });

    // 清理状态
    setShowEditorModal(false);
    setPendingEditorAction(null);
  };

  const handleCancelEditorSelection = () => {
    setShowEditorModal(false);
    setPendingEditorAction(null);
  };

  const handleViewReadme = (folderUri: string, folderName: string) => {
    if (!isVSCodeApiAvailable()) {
      console.warn('VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    postMessage({ 
      type: 'readReadmeContent', 
      payload: { 
        uri: folderUri, 
        name: folderName 
      } 
    });
  };

  const handleCloseReadmeModal = () => {
    setShowReadmeModal(false);
    setReadmeContent('');
    setCurrentReadmeInfo(null);
  };

  // 处理克隆仓库
  const handleCloneToDirectory = (directory: AddedDirectory) => {
    setCloneTargetDirectory(directory);
    setShowCloneModal(true);
    cloneForm.resetFields();
  };

  // 取消克隆
  const handleCancelClone = () => {
    setShowCloneModal(false);
    setCloneTargetDirectory(null);
    resetCloneState();
    cloneForm.resetFields();
  };

  // 提交克隆
  const handleSubmitClone = async (values: { 
    inputType: 'existing' | 'manual';
    existingRepository?: string;
    manualUrl?: string;
    cloneType: 'https' | 'ssh';
  }) => {
    if (!cloneTargetDirectory) {
      message.error('未选择目标目录');
      return;
    }

    try {
      let repositoryUrl = '';
      
      if (values.inputType === 'existing' && values.existingRepository) {
        // 从已有仓库中选择
        repositoryUrl = values.existingRepository;
      } else if (values.inputType === 'manual' && values.manualUrl) {
        // 手动输入仓库地址
        const validation = validateRepositoryUrl(values.manualUrl);
        if (!validation.isValid) {
          message.error(validation.error);
          return;
        }
        repositoryUrl = values.manualUrl;
      } else {
        message.error('请选择仓库或输入仓库地址');
        return;
      }

      // 保存目标目录引用（关闭弹窗前）
      const targetDir = cloneTargetDirectory;
      
      // 立即关闭弹窗，让克隆在后台进行
      setShowCloneModal(false);
      setCloneTargetDirectory(null);
      cloneForm.resetFields();
      
      // 启动克隆（后台进行）
      await cloneRepository(repositoryUrl, targetDir, values.cloneType);
    } catch (error) {
      console.error('Clone error:', error);
    }
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

  // 处理删除目录
  const handleDeleteDirectory = (directoryId: string) => {
    const directoryToDelete = config.addedDirectories.find(dir => dir.id === directoryId);
    if (!directoryToDelete) return;

    // 如果目录中有收藏的子文件夹，提示用户
    const favoriteCount = directoryToDelete.subfolders.filter(sf => sf.isFavorite).length;
    if (favoriteCount > 0) {
      Modal.confirm({
        title: '确定要删除这个目录吗？',
        content: `目录"${directoryToDelete.name}"中还有 ${favoriteCount} 个收藏的子文件夹，删除后将无法恢复。`,
        okText: '确定删除',
        cancelText: '取消',
        okType: 'danger',
        onOk: () => {
          performDeleteDirectory(directoryId);
        },
      });
    } else {
      // 没有收藏的子文件夹，直接删除
      performDeleteDirectory(directoryId);
    }
  };

  // 执行删除目录操作
  const performDeleteDirectory = (directoryId: string) => {
    const updatedDirectories = config.addedDirectories.filter(dir => dir.id !== directoryId);
    
    const updated = {
      ...config,
      addedDirectories: updatedDirectories,
    };

    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });
  };

  // 获取所有收藏的子文件夹
  const getFavoriteSubfolders = () => {
    const favorites: Array<{ name: string; uri: string; parentName: string; hasReadme?: boolean }> = [];
    config.addedDirectories.forEach((dir) => {
      dir.subfolders.forEach((sf) => {
        if (sf.isFavorite) {
          favorites.push({
            name: sf.name,
            uri: sf.uri,
            parentName: dir.name,
            hasReadme: sf.hasReadme,
          });
        }
      });
    });
    return favorites;
  };

  const favoriteSubfolders = getFavoriteSubfolders();

  // Handle favorites collapse toggle
  const handleFavoritesToggle = (activeKeys: string | string[]) => {
    const keys = Array.isArray(activeKeys) ? activeKeys : [activeKeys];
    setFavoritesExpanded(keys.includes('favorites'));
  };

  // Handle directory collapse toggle
  const handleDirectoryToggle = (directoryId: string, activeKeys: string | string[]) => {
    const keys = Array.isArray(activeKeys) ? activeKeys : [activeKeys];
    const isExpanded = keys.includes(directoryId);
    
    setDirectoryExpandedStates(prev => ({
      ...prev,
      [directoryId]: isExpanded
    }));
  };

  // Get active keys for directory collapse
  const getDirectoryActiveKeys = (directoryId: string): string[] => {
    // Default to expanded (true) if no state is saved
    const isExpanded = directoryExpandedStates[directoryId] !== undefined 
      ? directoryExpandedStates[directoryId] 
      : true;
    return isExpanded ? [directoryId] : [];
  };


  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--vscode-sideBar-background)' }}>
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
        
        /* Markdown 样式 */
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          color: var(--vscode-foreground);
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
          line-height: 1.25;
        }
        
        .markdown-content h1 {
          font-size: 2em;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 0.3em;
        }
        
        .markdown-content h2 {
          font-size: 1.5em;
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 0.3em;
        }
        
        .markdown-content h3 {
          font-size: 1.25em;
        }
        
        .markdown-content h4 {
          font-size: 1em;
        }
        
        .markdown-content h5 {
          font-size: 0.875em;
        }
        
        .markdown-content h6 {
          font-size: 0.85em;
          color: var(--vscode-descriptionForeground);
        }
        
        .markdown-content p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .markdown-content blockquote {
          padding: 0 1em;
          color: var(--vscode-descriptionForeground);
          border-left: 0.25em solid var(--vscode-panel-border);
          margin: 0 0 16px 0;
        }
        
        .markdown-content blockquote > :first-child {
          margin-top: 0;
        }
        
        .markdown-content blockquote > :last-child {
          margin-bottom: 0;
        }
        
        .markdown-content ul,
        .markdown-content ol {
          padding-left: 2em;
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .markdown-content li {
          margin-bottom: 0.25em;
        }
        
        .markdown-content code {
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          background-color: var(--vscode-textCodeBlock-background);
          border-radius: 6px;
          font-family: var(--vscode-editor-font-family, "Consolas", "Monaco", "Courier New", monospace);
        }
        
        .markdown-content pre {
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background-color: var(--vscode-textCodeBlock-background);
          border-radius: 6px;
          margin-bottom: 16px;
        }
        
        .markdown-content pre code {
          display: inline;
          max-width: auto;
          padding: 0;
          margin: 0;
          overflow: visible;
          line-height: inherit;
          word-wrap: normal;
          background-color: transparent;
          border: 0;
        }
        
        .markdown-content table {
          border-spacing: 0;
          border-collapse: collapse;
          margin-bottom: 16px;
          width: 100%;
        }
        
        .markdown-content table th,
        .markdown-content table td {
          padding: 6px 13px;
          border: 1px solid var(--vscode-panel-border);
        }
        
        .markdown-content table th {
          font-weight: 600;
          background-color: var(--vscode-list-hoverBackground);
        }
        
        .markdown-content table tr:nth-child(2n) {
          background-color: var(--vscode-list-hoverBackground);
        }
        
        .markdown-content hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: var(--vscode-panel-border);
          border: 0;
        }
        
        .markdown-content a {
          color: var(--vscode-textLink-foreground);
          text-decoration: none;
        }
        
        .markdown-content a:hover {
          color: var(--vscode-textLink-activeForeground);
          text-decoration: underline;
        }
        
        .markdown-content img {
          max-width: 100%;
          height: auto;
        }
        
      `}</style>
      <Header onBookmarkAdd={handleBookmarkAdd} onRepoAdd={handleRepoAdd} onFolderAdd={handleAdd} />
      <Content style={{ padding: '8px' }}>
        <div className="drag-container">
          {/* 收藏区域 */}
          <div className="drag-item">
            <Collapse 
              ghost
              activeKey={favoritesExpanded ? ['favorites'] : []}
              onChange={handleFavoritesToggle}
            >
              <Collapse.Panel 
                key="favorites" 
                header={
                  <span style={{ userSelect: 'none' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
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
                          <span 
                            style={{ 
                              color: 'var(--vscode-foreground)',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleOpenInEditor(item.uri, item.name)}
                            title="在编辑器中打开"
                          >
                            {item.name}
                          </span>
                          <Button
                            type="text"
                            size="small"
                            icon={<FolderOpenOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInEditor(item.uri, item.name);
                            }}
                            style={{
                              color: 'var(--vscode-foreground)',
                              padding: '0',
                              width: '20px',
                              height: '20px',
                              minWidth: '20px',
                              fontSize: '12px',
                              marginLeft: '4px',
                            }}
                            title="在编辑器中打开"
                          />
                          {/* 如果有README文件，显示ReadOutlined图标 */}
                          {favoriteSubfolders.find(fav => fav.uri === item.uri)?.hasReadme && (
                            <Button
                              type="text"
                              size="small"
                              icon={<ReadOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReadme(item.uri, item.name);
                              }}
                              style={{
                                color: 'var(--vscode-foreground)',
                                padding: '0',
                                width: '20px',
                                height: '20px',
                                minWidth: '20px',
                                fontSize: '12px',
                                marginLeft: '4px',
                              }}
                              title="查看README"
                            />
                          )}
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
                ghost
                activeKey={getDirectoryActiveKeys(f.id)}
                onChange={(activeKeys) => handleDirectoryToggle(f.id, activeKeys)}
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
                        cursor: 'grab',
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      title="拖拽整个标题栏进行排序"
                    >
                      <span style={{
                        color: 'var(--vscode-sideBarSectionHeader-foreground)',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}>
                        {f.name} ({f.subfolders.length})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<CodeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTerminal(f.uri);
                          }}
                          style={{
                            color: 'var(--vscode-sideBarSectionHeader-foreground)',
                            opacity: 0.8,
                            fontSize: '12px',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                          }}
                          title="在此目录打开终端"
                        />
                        <MoreDropdown
                          items={[
                            {
                              key: 'open',
                              icon: <FolderOutlined />,
                              label: '打开目录',
                              onClick: (e: any) => {
                                e?.domEvent?.stopPropagation();
                                handleOpenInFileManager(f.uri);
                              },
                            },
                            {
                              key: 'clone',
                              icon: <DownloadOutlined />,
                              label: '克隆仓库',
                              onClick: (e: any) => {
                                e?.domEvent?.stopPropagation();
                                handleCloneToDirectory(f);
                              },
                            },
                            {
                              key: 'refresh',
                              icon: <ReloadOutlined />,
                              label: '刷新目录',
                              onClick: (e: any) => {
                                e?.domEvent?.stopPropagation();
                                handleRefreshDirectory(f.uri);
                              },
                            },
                            {
                              type: 'divider' as const,
                            },
                            {
                              key: 'delete',
                              icon: <DeleteOutlined />,
                              label: '删除目录',
                              danger: true,
                              onClick: (e: any) => {
                                e?.domEvent?.stopPropagation();
                                handleDeleteDirectory(f.id);
                              },
                            },
                          ]}
                        />
                      </div>
                    </div>
                  }
                >
                  <List
                    size="small"
                    dataSource={f.subfolders}
                    renderItem={(sf) => (
                      <List.Item style={{ border: 'none', padding: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
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
                          <span 
                            style={{ 
                              color: 'var(--vscode-foreground)', 
                              cursor: 'pointer',
                            }}
                            onClick={() => handleOpenInEditor(sf.uri, sf.name)}
                            title="在编辑器中打开"
                          >
                            {sf.name}
                          </span>
                          <Button
                            type="text"
                            size="small"
                            icon={<FolderOpenOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInEditor(sf.uri, sf.name);
                            }}
                            style={{
                              color: 'var(--vscode-foreground)',
                              padding: '0',
                              width: '20px',
                              height: '20px',
                              minWidth: '20px',
                              fontSize: '12px',
                              marginLeft: '4px',
                            }}
                            title="在编辑器中打开"
                          />
                          {/* 如果有README文件，显示ReadOutlined图标 */}
                          {sf.hasReadme && (
                            <Button
                              type="text"
                              size="small"
                              icon={<ReadOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReadme(sf.uri, sf.name);
                              }}
                              style={{
                                color: 'var(--vscode-foreground)',
                                padding: '0',
                                width: '20px',
                                height: '20px',
                                minWidth: '20px',
                                fontSize: '12px',
                                marginLeft: '4px',
                              }}
                              title="查看README"
                            />
                          )}
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

      {/* 编辑器选择模态框 */}
      <Modal
        title="选择编辑器"
        open={showEditorModal}
        onCancel={handleCancelEditorSelection}
        footer={null}
        centered
        width={300}
        style={{
          '--ant-modal-bg': 'var(--vscode-editor-background)',
          '--ant-modal-content-bg': 'var(--vscode-editor-background)',
        } as React.CSSProperties}
        styles={{
          content: {
            backgroundColor: 'var(--vscode-editor-background)',
            color: 'var(--vscode-foreground)',
            padding: '16px',
          },
          header: {
            backgroundColor: 'var(--vscode-editor-background)',
            borderBottom: '1px solid var(--vscode-panel-border)',
            padding: '12px 16px',
          },
          body: {
            padding: '8px 0',
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
        <div style={{ padding: '0' }}>
          <p style={{ 
            color: 'var(--vscode-foreground)', 
            marginBottom: '12px',
            fontSize: '13px',
            lineHeight: '1.4',
          }}>
            打开文件夹 <strong>{pendingEditorAction?.folderName}</strong>
          </p>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <Button
              size="small"
              onClick={() => handleEditorSelection('vscode')}
              style={{
                backgroundColor: 'var(--vscode-button-background)',
                borderColor: 'var(--vscode-button-border)',
                color: 'var(--vscode-button-foreground)',
                height: '32px',
                fontSize: '13px',
              }}
              block
            >
              VS Code
            </Button>
            <Button
              size="small"
              onClick={() => handleEditorSelection('cursor')}
              style={{
                backgroundColor: 'var(--vscode-button-background)',
                borderColor: 'var(--vscode-button-border)',
                color: 'var(--vscode-button-foreground)',
                height: '32px',
                fontSize: '13px',
              }}
              block
            >
              Cursor
            </Button>
          </div>
          <p style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            fontSize: '11px',
            marginTop: '12px',
            marginBottom: '0',
            lineHeight: '1.3',
          }}>
            选择将被保存为默认设置
          </p>
        </div>
      </Modal>

      {/* README查看模态框 */}
      <Modal
        title={`README - ${currentReadmeInfo?.name || ''}`}
        open={showReadmeModal}
        onCancel={handleCloseReadmeModal}
        footer={null}
        centered
        width={800}
        style={{
          '--ant-modal-bg': 'var(--vscode-editor-background)',
          '--ant-modal-content-bg': 'var(--vscode-editor-background)',
        } as React.CSSProperties}
        styles={{
          content: {
            backgroundColor: 'var(--vscode-editor-background)',
            color: 'var(--vscode-foreground)',
            padding: '16px',
            maxHeight: '70vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
          header: {
            backgroundColor: 'var(--vscode-editor-background)',
            borderBottom: '1px solid var(--vscode-panel-border)',
            padding: '12px 16px',
          },
          body: {
            padding: '8px 0',
            flex: 1,
            overflow: 'auto',
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
        <div 
          className="markdown-content"
          style={{ 
            maxHeight: '60vh', 
            overflow: 'auto',
            padding: '16px',
            backgroundColor: 'var(--vscode-editor-background)',
            color: 'var(--vscode-foreground)',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
          dangerouslySetInnerHTML={{ 
            __html: parsedMarkdown || '加载中...' 
          }}
        />
      </Modal>

      {/* 克隆仓库模态框 */}
      <Modal
        title={`克隆仓库到 - ${cloneTargetDirectory?.name || ''}`}
        open={showCloneModal}
        onCancel={handleCancelClone}
        footer={null}
        width={500}
        style={{ top: 40 }}
        styles={{
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
          form={cloneForm}
          layout="vertical"
          onFinish={handleSubmitClone}
          initialValues={{
            inputType: 'existing',
            cloneType: 'https'
          }}
          style={{ margin: 0 }}
        >
          <div style={{ 
            marginBottom: '16px', 
            padding: '8px 12px', 
            backgroundColor: 'var(--vscode-list-hoverBackground)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--vscode-foreground)',
            border: '1px solid var(--vscode-panel-border)',
          }}>
            <strong>目标目录:</strong> {cloneTargetDirectory?.name}
          </div>

          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>仓库来源</span>}
            name="inputType"
            style={{ marginBottom: '12px' }}
          >
            <Radio.Group style={{ fontSize: '12px' }}>
              <Radio value="existing">从已有仓库中选择</Radio>
              <Radio value="manual">手动输入仓库地址</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.inputType !== currentValues.inputType}>
            {({ getFieldValue }) => {
              const inputType = getFieldValue('inputType');
              
              if (inputType === 'existing') {
                return (
                  <Form.Item
                    label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>选择仓库</span>}
                    name="existingRepository"
                    rules={[{ required: true, message: '请选择一个仓库' }]}
                    style={{ marginBottom: '12px' }}
                  >
                    <Select
                      placeholder="选择已有仓库"
                      style={{ fontSize: '12px' }}
                      showSearch
                      optionFilterProp="children"
                    >
                      {(config.repositoryCategories || []).flatMap(category =>
                        category.repositories.map(repo => (
                          <Select.Option key={repo.id} value={repo.url}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>
                                [{(repo.provider || 'other').toUpperCase()}]
                              </span>
                              <span>{repo.name}</span>
                            </div>
                          </Select.Option>
                        ))
                      )}
                    </Select>
                  </Form.Item>
                );
              } else {
                return (
                  <Form.Item
                    label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>仓库地址</span>}
                    name="manualUrl"
                    rules={[{ required: true, message: '请输入仓库地址' }]}
                    style={{ marginBottom: '12px' }}
                  >
                    <Input.TextArea
                      placeholder={`支持以下格式：
• https://github.com/xxx/xxx
• https://github.com/xxx/xxx.git  
• git@github.com:xxx/xxx.git`}
                      style={{ fontSize: '12px', minHeight: '80px' }}
                      autoSize={{ minRows: 3, maxRows: 5 }}
                    />
                  </Form.Item>
                );
              }
            }}
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>克隆方式</span>}
            name="cloneType"
            style={{ marginBottom: '16px' }}
          >
            <Radio.Group style={{ fontSize: '12px' }}>
              <Radio value="https">HTTPS</Radio>
              <Radio value="ssh">SSH</Radio>
            </Radio.Group>
          </Form.Item>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              onClick={handleCancelClone}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={cloneState.isCloning}
              disabled={cloneState.isCloning}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              {cloneState.isCloning ? '克隆中...' : '开始克隆'}
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
