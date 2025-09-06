import React, { useEffect, useState, useCallback } from 'react';
import { Button, Layout, Modal, Form, Input, message, Select, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RepositoryItem, RepositoryCategory, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import Header from './Header';
import { RepositoryCategoryComponent } from './components';
import { extractRepoInfo, copyToClipboard, parseRepositoryInput, validateRepositoryUrl } from './utils';
import { useClone } from './hooks/useClone';

const { Content } = Layout;

export default function Repositories() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingCategory, setRenamingCategory] = useState<{id: string, name: string} | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneRepository, setCloneRepository] = useState<{repository: RepositoryItem, cloneType: 'https' | 'ssh'} | null>(null);
  
  // 使用克隆 hook
  const { cloneState, resetCloneState } = useClone(config.addedDirectories);
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const [renameForm] = Form.useForm();
  const [cloneForm] = Form.useForm();

  // 拖拽状态管理
  const [draggedRepository, setDraggedRepository] = useState<{ repositoryId: string; categoryId: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [dragOverRepository, setDragOverRepository] = useState<{ repositoryId: string; categoryId: string } | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      
      if (msg?.type === 'configLoaded' && msg.payload) {
        // 确保 repositoryCategories 字段存在，如果不存在则使用默认值
        const loadedConfig = {
          ...msg.payload,
          repositoryCategories: msg.payload.repositoryCategories || DEFAULT_CONFIG.repositoryCategories,
        };
        setConfig(loadedConfig);
      }
      
      if (msg?.type === 'directorySelected' && msg.payload) {
        // 处理新目录选择结果
        const { directory, cloneInfo } = msg.payload;
        
        console.log('[Repositories] 收到目录选择消息:', directory);
        console.log('[Repositories] 当前 config 状态:', config);
        
        // 🔑 使用函数式更新，确保基于最新状态进行操作
        setConfig((currentConfig) => {
          console.log('[Repositories] 基于最新配置处理目录选择:', currentConfig);
          
          // 检查是否已经存在相同的目录（使用正确的 URI 格式）
          const existingDirectory = (currentConfig.addedDirectories || []).find(
            dir => {
              // 比较 URI（主要匹配方式）
              if (dir.uri === directory.uri) return true;
              
              // 比较名称（备用匹配方式）
              if (dir.name === directory.name) return true;
              
              // 比较文件系统路径（如果可能的话）
              try {
                if (directory.path && dir.uri.includes(directory.path.replace(/\\/g, '/'))) return true;
              } catch (e) {}
              
              return false;
            }
          );
          
          let targetDirectoryId: string;
          let updatedConfig: ProjectConfig;
          
          if (existingDirectory) {
            // 如果目录已存在，直接使用现有的目录（保留所有现有数据）
            targetDirectoryId = existingDirectory.id;
            console.log('[Repositories] 发现已存在目录:', existingDirectory);
            message.info(`目录 "${directory.name}" 已存在，将使用现有目录`);
            
            // 保持配置不变，不丢失任何数据
            updatedConfig = currentConfig;
          } else {
            // 如果目录不存在，添加到 addedDirectories
            const newDirectory = {
              id: `dir-${Date.now()}`,
              name: directory.name,
              uri: directory.uri, // 使用正确的 URI 格式
              subfolders: [],
              addedAt: new Date().toISOString(),
            };
            
            console.log('[Repositories] 添加新目录:', newDirectory);
            
            // 🔑 基于当前最新配置创建更新版本，保留所有其他数据
            updatedConfig = {
              ...currentConfig, // 保留所有现有配置
              addedDirectories: [...(currentConfig.addedDirectories || []), newDirectory],
            };
            
            // 异步保存更新后的配置
            postMessage({ type: 'saveConfig', payload: updatedConfig });
            
            targetDirectoryId = newDirectory.id;
            message.success(`已添加新目录：${directory.name}`);
          }
          
          // 异步操作，避免阻塞状态更新
          setTimeout(() => {
            // 自动选择目录
            cloneForm.setFieldsValue({ directoryId: targetDirectoryId });
            
            // 如果有克隆信息，自动开始克隆
            if (cloneInfo && cloneRepository) {
              // 🔧 确保使用文件系统路径而不是URI
              const targetPath = directory.path || (directory.uri ? decodeURIComponent(directory.uri.replace('file://', '')) : '');
              
              console.log('[Repositories] Auto clone target path:', targetPath);
              
              postMessage({ 
                type: 'cloneRepository', 
                payload: { 
                  url: cloneInfo.url, 
                  name: cloneRepository.repository.name,
                  cloneType: cloneInfo.cloneType,
                  targetDirectory: targetPath  // 使用文件系统路径
                } 
              });
              
              // 不在这里关闭对话框，等待克隆开始消息
            }
          }, 0);
          
          return updatedConfig;
        });
      }
      
      // 处理克隆消息的逻辑已移动到 useClone hook 中
    };
    
    window.addEventListener('message', handler);
    
    // 请求加载配置
    try {
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Repositories] failed to send loadConfig', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []); // 保持空依赖数组，避免频繁重新设置事件监听器

  // 拖拽处理函数
  const handleRepositoryDragStart = (repositoryId: string, categoryId: string) => {
    setDraggedRepository({ repositoryId, categoryId });
  };

  const handleRepositoryDragEnd = () => {
    setDraggedRepository(null);
    setDragOverCategory(null);
    setDragOverRepository(null);
  };

  const handleCategoryDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverCategory(null);
    }
  };

  const handleCategoryDrop = (e: React.DragEvent, toCategoryId: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    if (!draggedRepository || draggedRepository.categoryId === toCategoryId) {
      setDraggedRepository(null);
      setDragOverRepository(null);
      return;
    }

    handleMoveRepository(draggedRepository.repositoryId, draggedRepository.categoryId, toCategoryId, 0);
    
    setDraggedRepository(null);
    setDragOverRepository(null);
  };

  const handleRepositoryDragOver = (e: React.DragEvent, repositoryId: string, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRepository({ repositoryId, categoryId });
  };

  const handleRepositoryDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverRepository(null);
    }
  };

  const handleRepositoryDrop = (e: React.DragEvent, targetRepositoryId: string, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverRepository(null);

    if (!draggedRepository || draggedRepository.repositoryId === targetRepositoryId) {
      setDraggedRepository(null);
      setDragOverCategory(null);
      return;
    }

    const targetCategory = (config.repositoryCategories || []).find(cat => cat.id === targetCategoryId);
    if (!targetCategory) {
      setDraggedRepository(null);
      setDragOverCategory(null);
      return;
    }

    const targetIndex = targetCategory.repositories.findIndex(r => r.id === targetRepositoryId);
    
    if (draggedRepository.categoryId === targetCategoryId) {
      const sourceIndex = targetCategory.repositories.findIndex(r => r.id === draggedRepository.repositoryId);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newRepositories = [...targetCategory.repositories];
        const [movedRepository] = newRepositories.splice(sourceIndex, 1);
        newRepositories.splice(targetIndex, 0, movedRepository);
        handleReorderRepositories(targetCategoryId, newRepositories);
      }
    } else {
      handleMoveRepository(draggedRepository.repositoryId, draggedRepository.categoryId, targetCategoryId, targetIndex);
    }
    
    setDraggedRepository(null);
    setDragOverCategory(null);
  };

  const handleAddRepository = () => {
    setShowAddModal(true);
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setLoading(false);
    setNewCategoryName('');
    form.resetFields();
  };

  // 处理新分类名称输入
  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(e.target.value);
  };

  // 处理回车创建新分类
  const handleCreateNewCategory = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCategoryName.trim()) {
      e.preventDefault();
      
      const newCategory = {
        id: `category-${Date.now()}`,
        name: newCategoryName.trim(),
        collapsed: false,
        repositories: [],
        createdAt: new Date().toISOString(),
      };
      

      const defaultCategories = (config.repositoryCategories || [])
        .filter(category => category.name === '未分类' || category.id === 'default-repo');
      const otherCategories = (config.repositoryCategories || [])
        .filter(category => category.name !== '未分类' && category.id !== 'default-repo');
      
      const updatedConfig = {
        ...config,
        repositoryCategories: [...defaultCategories, newCategory, ...otherCategories],
      };
      
      setConfig(updatedConfig);
      postMessage({ type: 'saveConfig', payload: updatedConfig });
      
      setTimeout(() => {
        form.setFieldsValue({ categoryId: newCategory.id });
        form.getFieldInstance('categoryId')?.blur();
        form.getFieldInstance('categoryId')?.focus();
      }, 0);
      
      setNewCategoryName('');
    }
  };

  const handleSubmitAdd = async (values: { url: string; categoryId?: string }) => {
    setLoading(true);
    try {
      let { url, categoryId } = values;
      
      // 确保 URL 有协议
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // 验证 URL 格式
      new URL(url);

      // 提取仓库信息
      const { name, provider, cloneUrls } = extractRepoInfo(url);

      // 使用默认分类如果没有指定
      let targetCategoryId = categoryId;
      if (!targetCategoryId) {
        const defaultCategory = (config.repositoryCategories || []).find(cat => cat.name === '未分类');
        targetCategoryId = defaultCategory?.id || 'default-repo';
      }

      const newRepository: RepositoryItem = {
        id: Date.now().toString(),
        name,
        url,
        provider,
        cloneUrls,
        addedAt: new Date().toISOString(),
      };

      const updatedCategories = (config.repositoryCategories || []).map(category => 
        category.id === targetCategoryId 
          ? { ...category, repositories: [...category.repositories, newRepository] }
          : category
      );

      const updatedConfig = {
        ...config,
        repositoryCategories: updatedCategories,
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

  const handleDeleteRepository = (categoryId: string, repoId: string) => {
    const updatedCategories = (config.repositoryCategories || []).map(category => 
      category.id === categoryId 
        ? { ...category, repositories: category.repositories.filter(repo => repo.id !== repoId) }
        : category
    );

    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
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

  const handleReparseRepository = (repository: RepositoryItem) => {
    console.log('[Repositories] Reparsing repository:', repository);
    const { name, provider, cloneUrls } = extractRepoInfo(repository.url);
    
    const updatedCategories = (config.repositoryCategories || []).map(category => ({
      ...category,
      repositories: category.repositories.map(repo => 
        repo.id === repository.id 
          ? { ...repo, name, provider, cloneUrls }
          : repo
      )
    }));

    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success('仓库重新解析成功');
  };

  const handleCopyUrl = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      message.success('URL 已复制到剪贴板');
    } else {
      message.error('复制失败，请手动复制');
    }
  };

  const handleCloneRepository = async (repository: RepositoryItem, cloneType: 'https' | 'ssh') => {
    // 防止重复克隆
    if (cloneState.isCloning) {
      message.warning('正在进行克隆操作，请稍候...');
      return;
    }
    
    const cloneUrl = repository.cloneUrls?.[cloneType];
    if (!cloneUrl) {
      message.error(`无法获取 ${cloneType.toUpperCase()} 克隆地址`);
      return;
    }

    // 设置要克隆的仓库信息并打开目录选择模态框
    setCloneRepository({ repository, cloneType });
    setShowCloneModal(true);
  };

  const handleCancelClone = () => {
    setShowCloneModal(false);
    setCloneRepository(null);
    resetCloneState(); // 取消时清除克隆状态
    cloneForm.resetFields();
  };

  const handleSelectNewDirectory = () => {
    if (!cloneRepository) return;
    
    // 发送消息到扩展端选择新目录
    postMessage({ 
      type: 'selectDirectory',
      payload: {
        purpose: 'addToDirectories', // 标记这是为了添加到 addedDirectories
        repositoryName: cloneRepository.repository.name,
        cloneInfo: {
          url: cloneRepository.repository.cloneUrls?.[cloneRepository.cloneType],
          cloneType: cloneRepository.cloneType
        }
      } 
    });
  };

  const handleSubmitClone = async (values: { directoryId?: string }) => {
    if (!cloneRepository) return;

    const { repository, cloneType } = cloneRepository;
    const cloneUrl = repository.cloneUrls?.[cloneType];
    
    if (!cloneUrl) {
      message.error(`无法获取 ${cloneType.toUpperCase()} 克隆地址`);
      return;
    }

    if (values.directoryId) {
      // 用户选择了已有目录
      const selectedDirectory = (config.addedDirectories || []).find(dir => dir.id === values.directoryId);
      if (selectedDirectory) {
        // 🔧 将URI格式转换为文件系统路径
        let targetPath = selectedDirectory.uri;
        if (targetPath.startsWith('file://')) {
          // 移除 file:// 前缀并解码URI
          targetPath = decodeURIComponent(targetPath.replace('file://', ''));
        }
        
        console.log('[Repositories] Clone target URI:', selectedDirectory.uri);
        console.log('[Repositories] Clone target path:', targetPath);
        
        // 立即关闭弹窗，让克隆在后台进行
        setShowCloneModal(false);
        setCloneRepository(null);
        cloneForm.resetFields();
        
        // 启动克隆（后台进行）
        postMessage({ 
          type: 'cloneRepository', 
          payload: { 
            url: cloneUrl, 
            name: repository.name,
            cloneType,
            targetDirectory: targetPath  // 传递文件系统路径
          } 
        });
      } else {
        message.error('选择的目录不存在');
      }
    } else {
      message.error('请先选择一个目录');
    }
  };

  // 处理分类折叠/展开
  const handleToggleCollapse = (categoryId: string) => {
    const updatedCategories = (config.repositoryCategories || []).map(category =>
      category.id === categoryId 
        ? { ...category, collapsed: !category.collapsed }
        : category
    );

    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
  };

  // 处理分类内仓库重排序
  const handleReorderRepositories = (categoryId: string, newRepositories: RepositoryItem[]) => {
    const updatedCategories = (config.repositoryCategories || []).map(category =>
      category.id === categoryId 
        ? { ...category, repositories: newRepositories }
        : category
    );

    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
  };

  // 处理仓库跨分类移动
  const handleMoveRepository = (repositoryId: string, fromCategoryId: string, toCategoryId: string, toIndex: number) => {
    if (fromCategoryId === toCategoryId) return;

    const fromCategory = (config.repositoryCategories || []).find(cat => cat.id === fromCategoryId);
    const repository = fromCategory?.repositories.find(r => r.id === repositoryId);
    
    if (!repository || !fromCategory) return;

    const updatedCategories = (config.repositoryCategories || []).map(category => {
      if (category.id === fromCategoryId) {
        return {
          ...category,
          repositories: category.repositories.filter(r => r.id !== repositoryId),
        };
      } else if (category.id === toCategoryId) {
        const newRepositories = [...category.repositories];
        newRepositories.splice(toIndex, 0, repository);
        return {
          ...category,
          repositories: newRepositories,
        };
      }
      return category;
    });

    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success(`仓库已移动到"${(config.repositoryCategories || []).find(cat => cat.id === toCategoryId)?.name}"`);
  };

  // 处理快速添加仓库到指定分类
  const handleQuickAdd = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setShowQuickAddModal(true);
  };

  // 处理重命名分类
  const handleRenameCategory = (categoryId: string, currentName: string) => {
    setRenamingCategory({ id: categoryId, name: currentName });
    setShowRenameModal(true);
    renameForm.setFieldsValue({ categoryName: currentName });
  };

  // 处理删除分类
  const handleDeleteCategory = (categoryId: string) => {
    const categoryToDelete = (config.repositoryCategories || []).find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    if (categoryToDelete.repositories.length > 0) {
      Modal.confirm({
        title: '确定要删除这个分类吗？',
        content: `分类"${categoryToDelete.name}"中还有 ${categoryToDelete.repositories.length} 个仓库，删除后将无法恢复。`,
        okText: '确定删除',
        cancelText: '取消',
        okType: 'danger',
        onOk: () => {
          performDeleteCategory(categoryId);
        },
      });
    } else {
      performDeleteCategory(categoryId);
    }
  };

  // 执行删除分类操作
  const performDeleteCategory = (categoryId: string) => {
    const updatedCategories = (config.repositoryCategories || []).filter(category => category.id !== categoryId);
    
    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success('分类删除成功');
  };

  const handleCancelQuickAdd = () => {
    setShowQuickAddModal(false);
    setSelectedCategoryId('');
    quickAddForm.resetFields();
  };

  const handleCancelRename = () => {
    setShowRenameModal(false);
    setRenamingCategory(null);
    renameForm.resetFields();
  };

  const handleSubmitRename = async (values: { categoryName: string }) => {
    if (!renamingCategory) return;

    const newName = values.categoryName.trim();
    if (!newName) {
      message.error('分类名称不能为空');
      return;
    }

    const existingCategory = (config.repositoryCategories || []).find(
      cat => cat.name === newName && cat.id !== renamingCategory.id
    );
    if (existingCategory) {
      message.error('分类名称已存在');
      return;
    }

    const updatedCategories = (config.repositoryCategories || []).map(category =>
      category.id === renamingCategory.id 
        ? { ...category, name: newName }
        : category
    );

    const updatedConfig = {
      ...config,
      repositoryCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success('分类重命名成功');
    
    handleCancelRename();
  };

  const handleSubmitQuickAdd = async (values: { url: string }) => {
    setLoading(true);
    try {
      let { url } = values;
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      new URL(url);

      const { name, provider, cloneUrls } = extractRepoInfo(url);

      const newRepository: RepositoryItem = {
        id: Date.now().toString(),
        name,
        url,
        provider,
        cloneUrls,
        addedAt: new Date().toISOString(),
      };

      const updatedCategories = (config.repositoryCategories || []).map(category => 
        category.id === selectedCategoryId 
          ? { ...category, repositories: [...category.repositories, newRepository] }
          : category
      );

      const updatedConfig = {
        ...config,
        repositoryCategories: updatedCategories,
      };

      setConfig(updatedConfig);
      postMessage({ type: 'saveConfig', payload: updatedConfig });
      
      message.success('仓库添加成功');
      setShowQuickAddModal(false);
      quickAddForm.resetFields();
    } catch (error) {
      console.error('Error processing URL:', error);
      message.error('URL 格式无效');
    } finally {
      setLoading(false);
    }
  };

  const totalRepositories = (config.repositoryCategories || []).reduce((sum, category) => sum + category.repositories.length, 0);
  

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--vscode-sideBar-background)' }}>
      <style>{`
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
        
        .bookmark-item-being-dragged {
          opacity: 0.5 !important;
        }
        
        .bookmark-item-drop-target {
          background-color: var(--vscode-list-hoverBackground) !important;
          border: 2px dashed var(--vscode-focusBorder) !important;
          border-radius: 4px !important;
          transition: none !important;
        }
      `}</style>
      <Header onRepoAdd={handleAddRepository} />
      
      <Content style={{ padding: '8px' }}>
        <div style={{ marginBottom: '6px' }}>
          <h3 style={{ 
            color: 'var(--vscode-foreground)', 
            fontSize: '14px',
            fontWeight: 500,
          }}>
            仓库 ({totalRepositories})
          </h3>
        </div>

        {(config.repositoryCategories || []).length > 0 ? (
          <>
            {/* 渲染"未分类"分类，总是在最上方 */}
            {(config.repositoryCategories || [])
              .filter(category => category.name === '未分类' || category.id === 'default-repo')
              .map((category) => (
                <RepositoryCategoryComponent
                  key={category.id}
                  category={category}
                  onToggleCollapse={handleToggleCollapse}
                  onDeleteRepository={handleDeleteRepository}
                  onReparseRepository={handleReparseRepository}
                  onCopyUrl={handleCopyUrl}
                  onOpenRepository={handleOpenRepository}
                  onReorderRepositories={handleReorderRepositories}
                  onQuickAdd={handleQuickAdd}
                  onDeleteCategory={handleDeleteCategory}
                  onRenameCategory={handleRenameCategory}
                  onMoveRepository={handleMoveRepository}
                  onCloneRepository={handleCloneRepository}
                  draggedRepository={draggedRepository}
                  dragOverCategory={dragOverCategory}
                  dragOverRepository={dragOverRepository}
                  onRepositoryDragStart={handleRepositoryDragStart}
                  onRepositoryDragEnd={handleRepositoryDragEnd}
                  onCategoryDragOver={handleCategoryDragOver}
                  onCategoryDragLeave={handleCategoryDragLeave}
                  onCategoryDrop={handleCategoryDrop}
                  onRepositoryDragOver={handleRepositoryDragOver}
                  onRepositoryDragLeave={handleRepositoryDragLeave}
                  onRepositoryDrop={handleRepositoryDrop}
                />
              ))}
            
            {/* 渲染其他分类，支持拖拽排序 */}
            {(config.repositoryCategories || [])
              .filter(category => category.name !== '未分类' && category.id !== 'default-repo')
              .map((category) => (
                <RepositoryCategoryComponent
                  key={category.id}
                  category={category}
                  onToggleCollapse={handleToggleCollapse}
                  onDeleteRepository={handleDeleteRepository}
                  onReparseRepository={handleReparseRepository}
                  onCopyUrl={handleCopyUrl}
                  onOpenRepository={handleOpenRepository}
                  onReorderRepositories={handleReorderRepositories}
                  onQuickAdd={handleQuickAdd}
                  onDeleteCategory={handleDeleteCategory}
                  onRenameCategory={handleRenameCategory}
                  onMoveRepository={handleMoveRepository}
                  onCloneRepository={handleCloneRepository}
                  draggedRepository={draggedRepository}
                  dragOverCategory={dragOverCategory}
                  dragOverRepository={dragOverRepository}
                  onRepositoryDragStart={handleRepositoryDragStart}
                  onRepositoryDragEnd={handleRepositoryDragEnd}
                  onCategoryDragOver={handleCategoryDragOver}
                  onCategoryDragLeave={handleCategoryDragLeave}
                  onCategoryDrop={handleCategoryDrop}
                  onRepositoryDragOver={handleRepositoryDragOver}
                  onRepositoryDragLeave={handleRepositoryDragLeave}
                  onRepositoryDrop={handleRepositoryDrop}
                />
              ))}
          </>
        ) : (
          <div style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            fontSize: '12px',
            padding: '10px 0',
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
        width={380}
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
          form={form}
          layout="vertical"
          onFinish={handleSubmitAdd}
          style={{ margin: 0 }}
        >
          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>仓库地址</span>}
            name="url"
            rules={[
              { required: true, message: '请输入仓库地址' },
              { type: 'url', message: '请输入有效的仓库地址' },
            ]}
            style={{ marginBottom: '12px' }}
          >
            <Input
              placeholder="https://github.com/username/repository"
              style={{ fontSize: '12px', height: '28px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>选择分类</span>}
            name="categoryId"
            style={{ marginBottom: '12px' }}
          >
            <Select
              placeholder="选择现有分类"
              allowClear
              style={{ fontSize: '12px' }}
              popupRender={(menu) => (
                <>
                  <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--vscode-menu-separatorBackground)', marginBottom: '6px' }}>
                    <Input
                      placeholder="输入新分类名称，按回车创建"
                      value={newCategoryName}
                      onChange={handleNewCategoryChange}
                      onKeyDown={handleCreateNewCategory}
                      style={{ fontSize: '12px', height: '26px' }}
                      prefix={<PlusOutlined style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }} />}
                    />
                  </div>
                  {menu}
                </>
              )}
            >
              {(config.repositoryCategories || []).map(category => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name} ({category.repositories.length})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              onClick={handleCancelAdd}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              {loading ? '添加中...' : '添加'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 快速添加仓库模态框 */}
      <Modal
        title="添加仓库到分类"
        open={showQuickAddModal}
        onCancel={handleCancelQuickAdd}
        footer={null}
        width={380}
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
          form={quickAddForm}
          layout="vertical"
          onFinish={handleSubmitQuickAdd}
          style={{ margin: 0 }}
        >
          <div style={{ 
            marginBottom: '12px', 
            padding: '6px 10px', 
            backgroundColor: 'var(--vscode-list-hoverBackground)',
            borderRadius: '3px',
            fontSize: '12px',
            color: 'var(--vscode-foreground)',
            border: '1px solid var(--vscode-panel-border)',
          }}>
            分类: {(config.repositoryCategories || []).find(cat => cat.id === selectedCategoryId)?.name || ''}
          </div>

          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>仓库地址</span>}
            name="url"
            rules={[
              { required: true, message: '请输入仓库地址' },
              { type: 'url', message: '请输入有效的仓库地址' },
            ]}
            style={{ marginBottom: '12px' }}
          >
            <Input
              placeholder="https://github.com/username/repository"
              style={{ fontSize: '12px', height: '28px' }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              onClick={handleCancelQuickAdd}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              {loading ? '添加中...' : '添加'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 重命名分类模态框 */}
      <Modal
        title="重命名分类"
        open={showRenameModal}
        onCancel={handleCancelRename}
        footer={null}
        width={300}
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
          form={renameForm}
          layout="vertical"
          onFinish={handleSubmitRename}
          style={{ margin: 0 }}
        >
          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>分类名称</span>}
            name="categoryName"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 50, message: '分类名称最多50个字符' },
            ]}
            style={{ marginBottom: '12px' }}
          >
            <Input
              placeholder="输入分类名称"
              style={{ fontSize: '12px', height: '28px' }}
              autoFocus
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              onClick={handleCancelRename}
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ fontSize: '12px', height: '28px', padding: '0 12px' }}
            >
              确定
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 克隆仓库目录选择模态框 */}
      <Modal
        title={`克隆仓库 - ${cloneRepository?.repository.name || ''}`}
        open={showCloneModal}
        onCancel={handleCancelClone}
        footer={null}
        width={400}
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
            <div style={{ marginBottom: '4px' }}>
              <strong>仓库:</strong> {cloneRepository?.repository.name}
            </div>
            <div>
              <strong>协议:</strong> {cloneRepository?.cloneType.toUpperCase()}
            </div>
          </div>

          {(config.addedDirectories || []).length > 0 ? (
            <Form.Item
              label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>选择目标目录</span>}
              name="directoryId"
              style={{ marginBottom: '12px' }}
            >
              <Select
                placeholder="选择已有的父目录"
                style={{ fontSize: '12px' }}
                allowClear
              >
                {(config.addedDirectories || []).map(directory => (
                  <Select.Option key={directory.id} value={directory.id}>
                    {directory.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '12px',
              backgroundColor: 'var(--vscode-list-hoverBackground)',
              borderRadius: '4px',
              marginBottom: '12px',
            }}>
              暂无已添加的目录，请选择新目录
            </div>
          )}

          <div style={{ 
            borderTop: '1px solid var(--vscode-panel-border)', 
            paddingTop: '12px',
            marginTop: '8px'
          }}>
            <Button
              type="default"
              onClick={handleSelectNewDirectory}
              style={{ 
                fontSize: '12px', 
                height: '28px', 
                width: '100%',
                marginBottom: '16px'
              }}
            >
              选择新目录
            </Button>
          </div>

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
              {cloneState.isCloning ? '克隆中...' : '克隆'}
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
