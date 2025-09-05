import React, { useEffect, useState } from 'react';
import { Button, Layout, List, Modal, Form, Input, message, Spin, Popconfirm } from 'antd';
import { DeleteOutlined, CopyOutlined, GlobalOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BookmarkItem, ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import Header from './Header';

const { Content } = Layout;

// 可拖拽的书签项组件
interface SortableBookmarkItemProps {
  bookmark: BookmarkItem;
  onDelete: (id: string) => void;
  onReparse: (bookmark: BookmarkItem) => void;
  onCopy: (url: string) => void;
  onOpen: (url: string) => void;
}

function SortableBookmarkItem({ 
  bookmark, 
  onDelete, 
  onReparse, 
  onCopy, 
  onOpen 
}: SortableBookmarkItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <List.Item
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: isDragging ? 'var(--vscode-list-hoverBackground)' : 'transparent',
          cursor: isDragging ? 'grabbing' : 'default',
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
            {...listeners}
            style={{ 
              width: '20px', 
              height: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'grab',
              borderRadius: '2px',
              padding: '2px',
              transition: 'background-color 0.2s ease',
            }}
            title="拖拽排序"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onCopy(bookmark.url)}
              style={{
                color: 'var(--vscode-foreground)',
                padding: '0',
                width: '20px',
                height: '20px',
                minWidth: '20px',
                fontSize: '12px',
              }}
              title="复制链接"
            />
            {!bookmark.isParsing && (
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => onReparse(bookmark)}
                style={{
                  color: 'var(--vscode-foreground)',
                  padding: '0',
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  fontSize: '12px',
                }}
                title="重新解析"
              />
            )}
            <Popconfirm
              placement="left"
              title="确定要删除这个书签吗？"
              onConfirm={() => onDelete(bookmark.id)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{
                style: {
                  backgroundColor: 'var(--vscode-button-background)',
                  borderColor: 'var(--vscode-button-background)',
                }
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
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
            </Popconfirm>
          </div>
        </div>
      </List.Item>
    </div>
  );
}

export default function Bookmarks() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();


  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动8px才开始拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      console.log('[Bookmarks] received message:', msg);
      
      if (msg?.type === 'configLoaded' && msg.payload) {
        console.log('[Bookmarks] configLoaded:', msg.payload);
        console.log('[Bookmarks] Updated bookmarks:', msg.payload.bookmarks);
        setConfig(msg.payload);
      }
      
      if (msg?.type === 'bookmarkCreated' && msg.payload) {
        console.log('[Bookmarks] bookmarkCreated:', msg.payload);
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
      
      if (msg?.type === 'bookmarkUpdated' && msg.payload) {
        console.log('[Bookmarks] bookmarkUpdated:', msg.payload);
        const { bookmarkId, title, icon } = msg.payload;
        
        // 更新特定书签的信息
        setConfig(prevConfig => {
          if (!prevConfig) return prevConfig;
          
          const updatedBookmarks = (prevConfig.bookmarks || []).map(bookmark => 
            bookmark.id === bookmarkId 
              ? { ...bookmark, title, icon, isParsing: false }
              : bookmark
          );
          
          return {
            ...prevConfig,
            bookmarks: updatedBookmarks
          };
        });
      }
      
      if (msg?.type === 'bookmarkReparsing' && msg.payload) {
        console.log('[Bookmarks] bookmarkReparsing:', msg.payload);
        const { bookmarkId } = msg.payload;
        
        // 设置书签为解析中状态
        setConfig(prevConfig => {
          if (!prevConfig) return prevConfig;
          
          const updatedBookmarks = (prevConfig.bookmarks || []).map(bookmark => 
            bookmark.id === bookmarkId 
              ? { ...bookmark, isParsing: true }
              : bookmark
          );
          
          return {
            ...prevConfig,
            bookmarks: updatedBookmarks
          };
        });
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

      // 发送消息到扩展端快速创建书签
      console.log('[Bookmarks] Requesting quick bookmark creation for:', url);
      postMessage({ 
        type: 'createBookmarkQuick', 
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

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = (config.bookmarks || []).findIndex(bookmark => bookmark.id === active.id);
      const newIndex = (config.bookmarks || []).findIndex(bookmark => bookmark.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBookmarks = arrayMove(config.bookmarks || [], oldIndex, newIndex);
        const updatedConfig = {
          ...config,
          bookmarks: newBookmarks,
        };
        
        setConfig(updatedConfig);
        
        // 发送消息到扩展端保存配置
        postMessage({ 
          type: 'saveConfig', 
          payload: updatedConfig 
        });
      }
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(config.bookmarks || []).map(bookmark => bookmark.id)}
              strategy={verticalListSortingStrategy}
            >
              <List
                size="small"
                dataSource={config.bookmarks || []}
                renderItem={(bookmark) => (
                  <SortableBookmarkItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onDelete={handleDeleteBookmark}
                    onReparse={handleReparseBookmark}
                    onCopy={handleCopyUrl}
                    onOpen={handleOpenBookmark}
                  />
                )}
                style={{ padding: 0 }}
              />
            </SortableContext>
          </DndContext>
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
              {loading ? '添加中...' : '添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
