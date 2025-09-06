import React, { useEffect, useState } from 'react';
import { Button, Layout, List, Modal, Form, Input, message, Spin, Popconfirm, Collapse, Select, Divider, Dropdown } from 'antd';
import { DeleteOutlined, CopyOutlined, GlobalOutlined, ReloadOutlined, CaretRightOutlined, PlusOutlined, DownOutlined, RightOutlined, MoreOutlined } from '@ant-design/icons';
import type { BookmarkItem, BookmarkCategory, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import Header from './Header';

const { Content } = Layout;

// 书签分类组件
interface BookmarkCategoryComponentProps {
  category: BookmarkCategory;
  onToggleCollapse: (categoryId: string) => void;
  onDeleteBookmark: (categoryId: string, bookmarkId: string) => void;
  onReparseBookmark: (bookmark: BookmarkItem) => void;
  onCopyUrl: (url: string) => void;
  onOpenBookmark: (url: string) => void;
  onReorderBookmarks: (categoryId: string, bookmarks: BookmarkItem[]) => void;
  onQuickAdd: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoveBookmark: (bookmarkId: string, fromCategoryId: string, toCategoryId: string, toIndex: number) => void;
  draggedBookmark: { bookmarkId: string; categoryId: string } | null;
  dragOverCategory: string | null;
  dragOverBookmark: { bookmarkId: string; categoryId: string } | null;
  onBookmarkDragStart: (bookmarkId: string, categoryId: string) => void;
  onBookmarkDragEnd: () => void;
  onCategoryDragOver: (e: React.DragEvent, categoryId: string) => void;
  onCategoryDragLeave: (e: React.DragEvent) => void;
  onCategoryDrop: (e: React.DragEvent, categoryId: string) => void;
  onBookmarkDragOver: (e: React.DragEvent, bookmarkId: string, categoryId: string) => void;
  onBookmarkDragLeave: (e: React.DragEvent) => void;
  onBookmarkDrop: (e: React.DragEvent, bookmarkId: string, categoryId: string) => void;
}

function BookmarkCategoryComponent({ 
  category, 
  onToggleCollapse, 
  onDeleteBookmark,
  onReparseBookmark,
  onCopyUrl,
  onOpenBookmark,
  onReorderBookmarks,
  onQuickAdd,
  onDeleteCategory,
  onMoveBookmark,
  draggedBookmark,
  dragOverCategory,
  dragOverBookmark,
  onBookmarkDragStart,
  onBookmarkDragEnd,
  onCategoryDragOver,
  onCategoryDragLeave,
  onCategoryDrop,
  onBookmarkDragOver,
  onBookmarkDragLeave,
  onBookmarkDrop,
}: BookmarkCategoryComponentProps) {
  // 检查是否为"未分类"
  const isDefaultCategory = category.name === '未分类' || category.id === 'default';

  // 确保 collapsed 状态的稳定性，默认为展开状态
  const isCollapsed = category.collapsed === true;
  const activeKeys = isCollapsed ? [] : [category.id];


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
        {category.name} ({category.bookmarks.length})
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
          title="添加书签到此分类"
        />
        {!isDefaultCategory && (
          <Dropdown
            placement="bottomRight"
            trigger={['click']}
            menu={{
              items: [
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
              ],
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined style={{ fontSize: '14px', fontWeight: 700 }} />}
              onClick={(e) => {
                e.stopPropagation();
              }}
              style={{
                color: 'var(--vscode-foreground)',
                padding: '0',
                width: '20px',
                height: '20px',
                minWidth: '20px',
                fontSize: '12px',
              }}
              title="更多操作"
            />
          </Dropdown>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className={`${dragOverCategory === category.id ? 'drag-item-drop-target' : ''}`}
      onDragOver={(e) => onCategoryDragOver(e, category.id)}
      onDragLeave={onCategoryDragLeave}
      onDrop={(e) => onCategoryDrop(e, category.id)}
      style={{
      }}
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
                {category.bookmarks.length > 0 ? (
                  <List
                    size="small"
                    dataSource={category.bookmarks}
                    renderItem={(bookmark) => (
                      <SortableBookmarkItem
                        key={bookmark.id}
                        bookmark={bookmark}
                        categoryId={category.id}
                        onDelete={(id) => onDeleteBookmark(category.id, id)}
                        onReparse={onReparseBookmark}
                        onCopy={onCopyUrl}
                        onOpen={onOpenBookmark}
                        draggedBookmark={draggedBookmark}
                        dragOverBookmark={dragOverBookmark}
                        onBookmarkDragStart={onBookmarkDragStart}
                        onBookmarkDragEnd={onBookmarkDragEnd}
                        onBookmarkDragOver={onBookmarkDragOver}
                        onBookmarkDragLeave={onBookmarkDragLeave}
                        onBookmarkDrop={onBookmarkDrop}
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
                    暂无书签，点击 + 号添加
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// 可拖拽的书签项组件
interface SortableBookmarkItemProps {
  bookmark: BookmarkItem;
  categoryId: string;
  onDelete: (id: string) => void;
  onReparse: (bookmark: BookmarkItem) => void;
  onCopy: (url: string) => void;
  onOpen: (url: string) => void;
  draggedBookmark: { bookmarkId: string; categoryId: string } | null;
  dragOverBookmark: { bookmarkId: string; categoryId: string } | null;
  onBookmarkDragStart: (bookmarkId: string, categoryId: string) => void;
  onBookmarkDragEnd: () => void;
  onBookmarkDragOver: (e: React.DragEvent, bookmarkId: string, categoryId: string) => void;
  onBookmarkDragLeave: (e: React.DragEvent) => void;
  onBookmarkDrop: (e: React.DragEvent, bookmarkId: string, categoryId: string) => void;
}

function SortableBookmarkItem({ 
  bookmark, 
  categoryId,
  onDelete, 
  onReparse, 
  onCopy, 
  onOpen,
  draggedBookmark,
  dragOverBookmark,
  onBookmarkDragStart,
  onBookmarkDragEnd,
  onBookmarkDragOver,
  onBookmarkDragLeave,
  onBookmarkDrop,
}: SortableBookmarkItemProps) {
  const isDragging = draggedBookmark?.bookmarkId === bookmark.id;
  const isDropTarget = dragOverBookmark?.bookmarkId === bookmark.id;

  return (
    <div
      className={`${isDragging ? 'bookmark-item-being-dragged' : ''} ${isDropTarget ? 'bookmark-item-drop-target' : ''}`}
      onDragOver={(e) => onBookmarkDragOver(e, bookmark.id, categoryId)}
      onDragLeave={onBookmarkDragLeave}
      onDrop={(e) => onBookmarkDrop(e, bookmark.id, categoryId)}
    >
      <List.Item
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'transparent',
          cursor: 'default',
          userSelect: 'none', // 禁用文字选择
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          width: '100%',
        }}>
          {/* 网站图标 - 可拖拽 */}
          <div
            draggable
            onDragStart={() => onBookmarkDragStart(bookmark.id, categoryId)}
            onDragEnd={onBookmarkDragEnd}
            style={{ 
              width: '20px', 
              height: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0,
              cursor: isDragging ? 'grabbing' : 'grab',
              borderRadius: '2px',
              padding: '2px',
            }}
            title="拖拽排序"
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {bookmark.icon ? (
              <img
                src={bookmark.icon}
                alt=""
                style={{ 
                  width: '16px', 
                  height: '16px',
                  borderRadius: '2px',
                  pointerEvents: 'none', // 防止图片干扰拖拽
                }}
                onError={(e) => {
                  // 如果图标加载失败，隐藏图片，显示默认图标
                  console.log('[Bookmarks] Icon load failed for:', bookmark.icon);
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
                pointerEvents: 'none', // 防止图标干扰拖拽
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
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none', // 禁用文字选择
              }}
              onClick={() => onOpen(bookmark.url)}
              title={bookmark.title}
            >
              <span>{bookmark.title}</span>
              {bookmark.isParsing && (
                <span style={{
                  fontSize: '10px',
                  color: 'var(--vscode-descriptionForeground)',
                  fontStyle: 'italic',
                }}>
                  解析中...
                </span>
              )}
            </div>
            <div style={{ 
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '11px',
              cursor: 'pointer',
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'none', // 禁用文字选择
            }}
            onClick={() => onOpen(bookmark.url)}
            title={bookmark.url}
            >
              {bookmark.url}
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Dropdown
              placement="bottomRight"
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'copy',
                    icon: <CopyOutlined />,
                    label: '复制链接',
                    onClick: (e: any) => {
                      e?.domEvent?.stopPropagation();
                      onCopy(bookmark.url);
                    },
                  },
                  ...(!bookmark.isParsing ? [{
                    key: 'reparse',
                    icon: <ReloadOutlined />,
                    label: '重新解析',
                    onClick: (e: any) => {
                      e?.domEvent?.stopPropagation();
                      onReparse(bookmark);
                    },
                  }] : []),
                  {
                    type: 'divider' as const,
                  },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: '删除书签',
                    danger: true,
                    onClick: (e: any) => {
                      e?.domEvent?.stopPropagation();
                      onDelete(bookmark.id);
                    },
                  },
                ],
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined style={{ fontSize: '14px', fontWeight: 700 }} />}
                style={{
                  color: 'var(--vscode-foreground)',
                  padding: '0',
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  fontSize: '12px',
                }}
                title="更多操作"
              />
            </Dropdown>
          </div>
        </div>
      </List.Item>
    </div>
  );
}

export default function Bookmarks() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();

  // 拖拽状态管理
  const [draggedBookmark, setDraggedBookmark] = useState<{ bookmarkId: string; categoryId: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [dragOverBookmark, setDragOverBookmark] = useState<{ bookmarkId: string; categoryId: string } | null>(null);


  // 书签拖拽处理函数
  const handleBookmarkDragStart = (bookmarkId: string, categoryId: string) => {
    setDraggedBookmark({ bookmarkId, categoryId });
  };

  const handleBookmarkDragEnd = () => {
    setDraggedBookmark(null);
    setDragOverCategory(null);
    setDragOverBookmark(null);
  };

  const handleCategoryDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    // 只有当鼠标真正离开分类容器时才清除悬停状态
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

    if (!draggedBookmark || draggedBookmark.categoryId === toCategoryId) {
      // 清理拖拽状态
      setDraggedBookmark(null);
      setDragOverBookmark(null);
      return;
    }

    // 移动书签到分类开头
    handleMoveBookmark(draggedBookmark.bookmarkId, draggedBookmark.categoryId, toCategoryId, 0);
    
    // 清理拖拽状态
    setDraggedBookmark(null);
    setDragOverBookmark(null);
  };

  const handleBookmarkDragOver = (e: React.DragEvent, bookmarkId: string, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverBookmark({ bookmarkId, categoryId });
  };

  const handleBookmarkDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverBookmark(null);
    }
  };

  const handleBookmarkDrop = (e: React.DragEvent, targetBookmarkId: string, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverBookmark(null);

    if (!draggedBookmark || draggedBookmark.bookmarkId === targetBookmarkId) {
      // 清理拖拽状态
      setDraggedBookmark(null);
      setDragOverCategory(null);
      return;
    }

    const targetCategory = (config.bookmarkCategories || []).find(cat => cat.id === targetCategoryId);
    if (!targetCategory) {
      // 清理拖拽状态
      setDraggedBookmark(null);
      setDragOverCategory(null);
      return;
    }

    const targetIndex = targetCategory.bookmarks.findIndex(b => b.id === targetBookmarkId);
    
    if (draggedBookmark.categoryId === targetCategoryId) {
      // 同分类内重排序
      const sourceIndex = targetCategory.bookmarks.findIndex(b => b.id === draggedBookmark.bookmarkId);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newBookmarks = [...targetCategory.bookmarks];
        const [movedBookmark] = newBookmarks.splice(sourceIndex, 1);
        newBookmarks.splice(targetIndex, 0, movedBookmark);
        handleReorderBookmarks(targetCategoryId, newBookmarks);
      }
    } else {
      // 跨分类移动
      handleMoveBookmark(draggedBookmark.bookmarkId, draggedBookmark.categoryId, targetCategoryId, targetIndex);
    }
    
    // 清理拖拽状态
    setDraggedBookmark(null);
    setDragOverCategory(null);
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      
      if (msg?.type === 'configLoaded' && msg.payload) {
        setConfig(msg.payload);
      }
      
      if (msg?.type === 'bookmarkCreated' && msg.payload) {
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
      
      if (msg?.type === 'bookmarkAdded' && msg.payload) {
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
      
      if (msg?.type === 'bookmarkUpdated' && msg.payload) {
        const { bookmarkId, title, icon } = msg.payload;
        
        // 更新特定书签的信息
        setConfig(prevConfig => {
          if (!prevConfig) return prevConfig;
          
          const updatedCategories = (prevConfig.bookmarkCategories || []).map(category => ({
            ...category,
            bookmarks: category.bookmarks.map(bookmark => 
              bookmark.id === bookmarkId 
                ? { ...bookmark, title, icon, isParsing: false }
                : bookmark
            )
          }));
          
          return {
            ...prevConfig,
            bookmarkCategories: updatedCategories
          };
        });
      }
      
      if (msg?.type === 'bookmarkReparsing' && msg.payload) {
        const { bookmarkId } = msg.payload;
        
        // 设置书签为解析中状态
        setConfig(prevConfig => {
          if (!prevConfig) return prevConfig;
          
          const updatedCategories = (prevConfig.bookmarkCategories || []).map(category => ({
            ...category,
            bookmarks: category.bookmarks.map(bookmark => 
              bookmark.id === bookmarkId 
                ? { ...bookmark, isParsing: true }
                : bookmark
            )
          }));
          
          return {
            ...prevConfig,
            bookmarkCategories: updatedCategories
          };
        });
      }
    };
    
    window.addEventListener('message', handler);
    
    // 请求加载配置
    try {
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
      
      // 创建新分类
      const newCategory = {
        id: `category-${Date.now()}`,
        name: newCategoryName.trim(),
        collapsed: false,
        bookmarks: [],
        createdAt: new Date().toISOString(),
      };
      
      // 分离"未分类"和其他分类
      const defaultCategories = (config.bookmarkCategories || [])
        .filter(category => category.name === '未分类' || category.id === 'default');
      const otherCategories = (config.bookmarkCategories || [])
        .filter(category => category.name !== '未分类' && category.id !== 'default');
      
      // 更新配置：未分类在前，新分类在其他分类最前面
      const updatedConfig = {
        ...config,
        bookmarkCategories: [...defaultCategories, newCategory, ...otherCategories],
      };
      
      setConfig(updatedConfig);
      postMessage({ type: 'saveConfig', payload: updatedConfig });
      
      // 设置表单的 categoryId 为新创建的分类
      form.setFieldsValue({ categoryId: newCategory.id });
      
      // 清空输入框
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

      // 使用默认分类如果没有指定
      let targetCategoryId = categoryId;
      if (!targetCategoryId) {
        const defaultCategory = (config.bookmarkCategories || []).find(cat => cat.name === '未分类');
        targetCategoryId = defaultCategory?.id || 'default';
      }

      // 发送消息到扩展端快速创建书签
      console.log('[Bookmarks] Requesting quick bookmark creation for:', url, 'in category:', targetCategoryId);
      postMessage({ 
        type: 'createBookmarkQuick', 
        payload: { url, categoryId: targetCategoryId } 
      });

      // loading状态会在收到bookmarkAdded消息后关闭
    } catch (error) {
      console.error('Error processing URL:', error);
      message.error('URL 格式无效');
      setLoading(false);
    }
  };

  const handleDeleteBookmark = (categoryId: string, bookmarkId: string) => {
    const updatedCategories = (config.bookmarkCategories || []).map(category => 
      category.id === categoryId 
        ? { ...category, bookmarks: category.bookmarks.filter(bookmark => bookmark.id !== bookmarkId) }
        : category
    );

    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success('书签删除成功');
  };

  const handleReparseBookmark = (bookmark: BookmarkItem) => {
    console.log('[Bookmarks] Reparsing bookmark:', bookmark);
    postMessage({ 
      type: 'reparseBookmark', 
      payload: { 
        bookmarkId: bookmark.id,
        url: bookmark.url 
      } 
    });
  };

  const handleCopyUrl = async (url: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        message.success('URL 已复制到剪贴板');
      } else {
        // 降级方案：使用传统的复制方法
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        message.success('URL 已复制到剪贴板');
      }
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败，请手动复制');
    }
  };

  // 处理分类折叠/展开
  const handleToggleCollapse = (categoryId: string) => {
    const updatedCategories = (config.bookmarkCategories || []).map(category =>
      category.id === categoryId 
        ? { ...category, collapsed: !category.collapsed }
        : category
    );

    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
  };

  // 处理分类内书签重排序
  const handleReorderBookmarks = (categoryId: string, newBookmarks: BookmarkItem[]) => {
    const updatedCategories = (config.bookmarkCategories || []).map(category =>
      category.id === categoryId 
        ? { ...category, bookmarks: newBookmarks }
        : category
    );

    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
  };

  // 处理书签跨分类移动
  const handleMoveBookmark = (bookmarkId: string, fromCategoryId: string, toCategoryId: string, toIndex: number) => {
    // 如果是同一个分类，不处理
    if (fromCategoryId === toCategoryId) return;

    // 找到要移动的书签
    const fromCategory = (config.bookmarkCategories || []).find(cat => cat.id === fromCategoryId);
    const bookmark = fromCategory?.bookmarks.find(b => b.id === bookmarkId);
    
    if (!bookmark || !fromCategory) return;

    const updatedCategories = (config.bookmarkCategories || []).map(category => {
      if (category.id === fromCategoryId) {
        // 从源分类中移除书签
        return {
          ...category,
          bookmarks: category.bookmarks.filter(b => b.id !== bookmarkId),
        };
      } else if (category.id === toCategoryId) {
        // 添加书签到目标分类
        const newBookmarks = [...category.bookmarks];
        newBookmarks.splice(toIndex, 0, bookmark);
        return {
          ...category,
          bookmarks: newBookmarks,
        };
      }
      return category;
    });

    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    setConfig(updatedConfig);
    postMessage({ type: 'saveConfig', payload: updatedConfig });
    message.success(`书签已移动到"${(config.bookmarkCategories || []).find(cat => cat.id === toCategoryId)?.name}"`);
  };


  // 处理快速添加书签到指定分类
  const handleQuickAdd = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setShowQuickAddModal(true);
  };

  // 处理删除分类
  const handleDeleteCategory = (categoryId: string) => {
    const categoryToDelete = (config.bookmarkCategories || []).find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    // 如果分类中有书签，提示用户
    if (categoryToDelete.bookmarks.length > 0) {
      Modal.confirm({
        title: '确定要删除这个分类吗？',
        content: `分类"${categoryToDelete.name}"中还有 ${categoryToDelete.bookmarks.length} 个书签，删除后将无法恢复。`,
        okText: '确定删除',
        cancelText: '取消',
        okType: 'danger',
        onOk: () => {
          performDeleteCategory(categoryId);
        },
      });
    } else {
      // 空分类直接删除
      performDeleteCategory(categoryId);
    }
  };

  // 执行删除分类操作
  const performDeleteCategory = (categoryId: string) => {
    const updatedCategories = (config.bookmarkCategories || []).filter(category => category.id !== categoryId);
    
    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
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

  const handleSubmitQuickAdd = async (values: { url: string }) => {
    setLoading(true);
    try {
      let { url } = values;
      
      // 确保 URL 有协议
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // 验证 URL 格式
      new URL(url);

      // 发送消息到扩展端快速创建书签
      console.log('[Bookmarks] Requesting quick bookmark creation for:', url, 'in category:', selectedCategoryId);
      postMessage({ 
        type: 'createBookmarkQuick', 
        payload: { url, categoryId: selectedCategoryId } 
      });

      // loading状态会在收到消息后关闭
    } catch (error) {
      console.error('Error processing URL:', error);
      message.error('URL 格式无效');
      setLoading(false);
    }
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

  const totalBookmarks = (config.bookmarkCategories || []).reduce((sum, category) => sum + category.bookmarks.length, 0);

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
      <Header onBookmarkAdd={handleAddBookmark} />
      
      <Content style={{ padding: '8px' }}>
        <div style={{ marginBottom: '6px' }}>
          <h3 style={{ 
            color: 'var(--vscode-foreground)', 
            fontSize: '14px',
            fontWeight: 500,
          }}>
            书签 ({totalBookmarks})
          </h3>
        </div>

        {(config.bookmarkCategories || []).length > 0 ? (
          <>
            {/* 渲染"未分类"分类，总是在最上方 */}
            {(config.bookmarkCategories || [])
              .filter(category => category.name === '未分类' || category.id === 'default')
              .map((category) => (
                <BookmarkCategoryComponent
                  key={category.id}
                  category={category}
                  onToggleCollapse={handleToggleCollapse}
                  onDeleteBookmark={handleDeleteBookmark}
                  onReparseBookmark={handleReparseBookmark}
                  onCopyUrl={handleCopyUrl}
                  onOpenBookmark={handleOpenBookmark}
                  onReorderBookmarks={handleReorderBookmarks}
                  onQuickAdd={handleQuickAdd}
                  onDeleteCategory={handleDeleteCategory}
                  onMoveBookmark={handleMoveBookmark}
                  draggedBookmark={draggedBookmark}
                  dragOverCategory={dragOverCategory}
                  dragOverBookmark={dragOverBookmark}
                  onBookmarkDragStart={handleBookmarkDragStart}
                  onBookmarkDragEnd={handleBookmarkDragEnd}
                  onCategoryDragOver={handleCategoryDragOver}
                  onCategoryDragLeave={handleCategoryDragLeave}
                  onCategoryDrop={handleCategoryDrop}
                  onBookmarkDragOver={handleBookmarkDragOver}
                  onBookmarkDragLeave={handleBookmarkDragLeave}
                  onBookmarkDrop={handleBookmarkDrop}
                />
              ))}
            
            {/* 渲染其他分类，支持拖拽排序 */}
            {(config.bookmarkCategories || [])
              .filter(category => category.name !== '未分类' && category.id !== 'default')
              .map((category) => (
                <BookmarkCategoryComponent
                  key={category.id}
                  category={category}
                  onToggleCollapse={handleToggleCollapse}
                  onDeleteBookmark={handleDeleteBookmark}
                  onReparseBookmark={handleReparseBookmark}
                  onCopyUrl={handleCopyUrl}
                  onOpenBookmark={handleOpenBookmark}
                  onReorderBookmarks={handleReorderBookmarks}
                  onQuickAdd={handleQuickAdd}
                  onDeleteCategory={handleDeleteCategory}
                  onMoveBookmark={handleMoveBookmark}
                  draggedBookmark={draggedBookmark}
                  dragOverCategory={dragOverCategory}
                  dragOverBookmark={dragOverBookmark}
                  onBookmarkDragStart={handleBookmarkDragStart}
                  onBookmarkDragEnd={handleBookmarkDragEnd}
                  onCategoryDragOver={handleCategoryDragOver}
                  onCategoryDragLeave={handleCategoryDragLeave}
                  onCategoryDrop={handleCategoryDrop}
                  onBookmarkDragOver={handleBookmarkDragOver}
                  onBookmarkDragLeave={handleBookmarkDragLeave}
                  onBookmarkDrop={handleBookmarkDrop}
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
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>网页地址</span>}
            name="url"
            rules={[
              { required: true, message: '请输入网页地址' },
              { type: 'url', message: '请输入有效的网页地址' },
            ]}
            style={{ marginBottom: '12px' }}
          >
            <Input
              placeholder="https://example.com"
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
              {(config.bookmarkCategories || []).map(category => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name} ({category.bookmarks.length})
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

      {/* 快速添加书签模态框 */}
      <Modal
        title="添加书签到分类"
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
            分类: {(config.bookmarkCategories || []).find(cat => cat.id === selectedCategoryId)?.name || ''}
          </div>

          <Form.Item
            label={<span style={{ fontSize: '12px', color: 'var(--vscode-foreground)' }}>网页地址</span>}
            name="url"
            rules={[
              { required: true, message: '请输入网页地址' },
              { type: 'url', message: '请输入有效的网页地址' },
            ]}
            style={{ marginBottom: '12px' }}
          >
            <Input
              placeholder="https://example.com"
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
    </Layout>
  );
}
