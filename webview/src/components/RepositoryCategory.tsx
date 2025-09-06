import React from 'react';
import { Button, List, Collapse, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined, EditOutlined, GithubOutlined, GitlabOutlined, CodeOutlined } from '@ant-design/icons';
import type { RepositoryItem, RepositoryCategory } from '../types';
import MoreDropdown from './MoreDropdown';
import { DragContainer, DragItem, DragHandle } from './DragSortable';

// 仓库分类组件属性
interface RepositoryCategoryComponentProps {
  category: RepositoryCategory;
  onToggleCollapse: (categoryId: string) => void;
  onDeleteRepository: (categoryId: string, repositoryId: string) => void;
  onReparseRepository: (repository: RepositoryItem) => void;
  onCopyUrl: (url: string) => void;
  onOpenRepository: (url: string) => void;
  onReorderRepositories: (categoryId: string, repositories: RepositoryItem[]) => void;
  onQuickAdd: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onRenameCategory: (categoryId: string, currentName: string) => void;
  onMoveRepository: (repositoryId: string, fromCategoryId: string, toCategoryId: string, toIndex: number) => void;
  onCloneRepository: (repository: RepositoryItem, cloneType: 'https' | 'ssh') => void;
  draggedRepository: { repositoryId: string; categoryId: string } | null;
  dragOverCategory: string | null;
  dragOverRepository: { repositoryId: string; categoryId: string } | null;
  onRepositoryDragStart: (repositoryId: string, categoryId: string) => void;
  onRepositoryDragEnd: () => void;
  onCategoryDragOver: (e: React.DragEvent, categoryId: string) => void;
  onCategoryDragLeave: (e: React.DragEvent) => void;
  onCategoryDrop: (e: React.DragEvent, categoryId: string) => void;
  onRepositoryDragOver: (e: React.DragEvent, repositoryId: string, categoryId: string) => void;
  onRepositoryDragLeave: (e: React.DragEvent) => void;
  onRepositoryDrop: (e: React.DragEvent, repositoryId: string, categoryId: string) => void;
}

function RepositoryCategoryComponent({ 
  category, 
  onToggleCollapse, 
  onDeleteRepository,
  onReparseRepository,
  onCopyUrl,
  onOpenRepository,
  onReorderRepositories,
  onQuickAdd,
  onDeleteCategory,
  onRenameCategory,
  onMoveRepository,
  onCloneRepository,
  draggedRepository,
  dragOverCategory,
  dragOverRepository,
  onRepositoryDragStart,
  onRepositoryDragEnd,
  onCategoryDragOver,
  onCategoryDragLeave,
  onCategoryDrop,
  onRepositoryDragOver,
  onRepositoryDragLeave,
  onRepositoryDrop,
}: RepositoryCategoryComponentProps) {
  // 检查是否为"未分类"
  const isDefaultCategory = category.name === '未分类' || category.id === 'default-repo';

  // 确保 collapsed 状态的稳定性，默认为展开状态
  const isCollapsed = category.collapsed === true;
  const activeKeys = isCollapsed ? [] : [category.id];

  // 获取提供商图标
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

  // 获取提供商标签
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

  // 自定义 Collapse 头部
  const customHeader = (
    <div 
      className={isDefaultCategory ? 'default-category-header' : ''}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        width: '100%',
        cursor: isDefaultCategory ? 'pointer' : 'grab',
      }}
      title={isDefaultCategory ? "点击收藏或展开" : "拖拽整个分类进行排序"}
    >
      <span style={{
        color: 'var(--vscode-sideBarSectionHeader-foreground)',
        fontSize: '13px',
        fontWeight: 500,
      }}>
        {category.name} ({category.repositories.length})
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(category.id);
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
          title="添加仓库到此分类"
        />
        {!isDefaultCategory && (
          <MoreDropdown
            items={[
              {
                key: 'rename',
                icon: <EditOutlined />,
                label: '重命名分类',
                onClick: (e: any) => {
                  e?.domEvent?.stopPropagation();
                  onRenameCategory && onRenameCategory(category.id, category.name);
                },
              },
              {
                type: 'divider' as const,
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除分类',
                danger: true,
                onClick: (e: any) => {
                  e?.domEvent?.stopPropagation();
                  onDeleteCategory(category.id);
                },
              },
            ]}
          />
        )}
      </div>
    </div>
  );

  return (
    <DragContainer
      categoryId={category.id}
      isDragOver={dragOverCategory === category.id}
      onDragOver={(e) => onCategoryDragOver(e, category.id)}
      onDragLeave={onCategoryDragLeave}
      onDrop={(e) => onCategoryDrop(e, category.id)}
    >
      <Collapse
        ghost
        activeKey={activeKeys}
        onChange={() => onToggleCollapse(category.id)}
        destroyInactivePanel={false}
        items={[
          {
            key: category.id,
            label: customHeader,
            children: (
              <div>
                {category.repositories.length > 0 ? (
                  <List
                    size="small"
                    dataSource={category.repositories}
                    renderItem={(repository) => (
                      <SortableRepositoryItem
                        key={repository.id}
                        repository={repository}
                        categoryId={category.id}
                        onDelete={(id) => onDeleteRepository(category.id, id)}
                        onReparse={onReparseRepository}
                        onCopy={onCopyUrl}
                        onOpen={onOpenRepository}
                        onClone={onCloneRepository}
                        draggedRepository={draggedRepository}
                        dragOverRepository={dragOverRepository}
                        onRepositoryDragStart={onRepositoryDragStart}
                        onRepositoryDragEnd={onRepositoryDragEnd}
                        onRepositoryDragOver={onRepositoryDragOver}
                        onRepositoryDragLeave={onRepositoryDragLeave}
                        onRepositoryDrop={onRepositoryDrop}
                        getProviderIcon={getProviderIcon}
                        getProviderTag={getProviderTag}
                      />
                    )}
                    style={{ padding: 0 }}
                  />
                ) : (
                  <div style={{
                    padding: '10px',
                    textAlign: 'center',
                    color: 'var(--vscode-descriptionForeground)',
                    fontSize: '12px',
                  }}>
                    暂无仓库，点击 + 号添加
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </DragContainer>
  );
}

// 可拖拽的仓库项组件
interface SortableRepositoryItemProps {
  repository: RepositoryItem;
  categoryId: string;
  onDelete: (id: string) => void;
  onReparse: (repository: RepositoryItem) => void;
  onCopy: (url: string) => void;
  onOpen: (url: string) => void;
  onClone: (repository: RepositoryItem, cloneType: 'https' | 'ssh') => void;
  draggedRepository: { repositoryId: string; categoryId: string } | null;
  dragOverRepository: { repositoryId: string; categoryId: string } | null;
  onRepositoryDragStart: (repositoryId: string, categoryId: string) => void;
  onRepositoryDragEnd: () => void;
  onRepositoryDragOver: (e: React.DragEvent, repositoryId: string, categoryId: string) => void;
  onRepositoryDragLeave: (e: React.DragEvent) => void;
  onRepositoryDrop: (e: React.DragEvent, repositoryId: string, categoryId: string) => void;
  getProviderIcon: (provider: string) => React.ReactElement;
  getProviderTag: (provider: string) => React.ReactElement;
}

function SortableRepositoryItem({ 
  repository, 
  categoryId,
  onDelete, 
  onReparse, 
  onCopy, 
  onOpen,
  onClone,
  draggedRepository,
  dragOverRepository,
  onRepositoryDragStart,
  onRepositoryDragEnd,
  onRepositoryDragOver,
  onRepositoryDragLeave,
  onRepositoryDrop,
  getProviderIcon,
  getProviderTag,
}: SortableRepositoryItemProps) {
  const isDragging = draggedRepository?.repositoryId === repository.id;
  const isDropTarget = dragOverRepository?.repositoryId === repository.id;

  return (
    <DragItem
      itemId={repository.id}
      categoryId={categoryId}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      onDragStart={() => onRepositoryDragStart(repository.id, categoryId)}
      onDragEnd={onRepositoryDragEnd}
      onDragOver={(e) => onRepositoryDragOver(e, repository.id, categoryId)}
      onDragLeave={onRepositoryDragLeave}
      onDrop={(e) => onRepositoryDrop(e, repository.id, categoryId)}
    >
      <List.Item
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'transparent',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          width: '100%',
        }}>
          {/* 提供商图标 - 可拖拽 */}
          <DragHandle
            isDragging={isDragging}
            onDragStart={() => onRepositoryDragStart(repository.id, categoryId)}
            onDragEnd={onRepositoryDragEnd}
            style={{ 
              width: '20px', 
              height: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getProviderIcon(repository.provider || 'other')}
          </DragHandle>

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
                  userSelect: 'none',
                }}
                onClick={() => onOpen(repository.url)}
                title={repository.name}
              >
                {repository.name}
              </div>
              {getProviderTag(repository.provider || 'other')}
            </div>
            <div style={{ 
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '11px',
              cursor: 'pointer',
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
            onClick={() => onOpen(repository.url)}
            title={repository.url}
            >
              {repository.url}
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MoreDropdown
              items={[
                ...(repository.cloneUrls?.https ? [{
                  key: 'clone-https',
                  icon: <CodeOutlined />,
                  label: 'Clone (HTTPS)',
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation();
                    onClone(repository, 'https');
                  },
                }] : []),
                ...(repository.cloneUrls?.ssh ? [{
                  key: 'clone-ssh',
                  icon: <CodeOutlined />,
                  label: 'Clone (SSH)',
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation();
                    onClone(repository, 'ssh');
                  },
                }] : []),
                {
                  key: 'copy',
                  icon: <CodeOutlined />,
                  label: '复制链接',
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation();
                    onCopy(repository.url);
                  },
                },
                {
                  key: 'reparse',
                  icon: <EditOutlined />,
                  label: '重新解析',
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation();
                    onReparse(repository);
                  },
                },
                {
                  type: 'divider' as const,
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除仓库',
                  danger: true,
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation();
                    onDelete(repository.id);
                  },
                },
              ]}
            />
          </div>
        </div>
      </List.Item>
    </DragItem>
  );
}

export default RepositoryCategoryComponent;
