import React, { useState } from 'react';

// 通用拖拽状态管理
export interface DragState<T = any> {
  draggedItem: T | null;
  dragOverCategory: string | null;
  dragOverItem: T | null;
}

// 拖拽处理函数类型
export interface DragHandlers<T = any> {
  onItemDragStart: (item: T, categoryId: string) => void;
  onItemDragEnd: () => void;
  onCategoryDragOver: (e: React.DragEvent, categoryId: string) => void;
  onCategoryDragLeave: (e: React.DragEvent) => void;
  onCategoryDrop: (e: React.DragEvent, categoryId: string) => void;
  onItemDragOver: (e: React.DragEvent, item: T, categoryId: string) => void;
  onItemDragLeave: (e: React.DragEvent) => void;
  onItemDrop: (e: React.DragEvent, targetItem: T, categoryId: string) => void;
}

// 拖拽钩子函数
export function useDragSortable<T extends { id: string }>(
  onMoveItem: (itemId: string, fromCategoryId: string, toCategoryId: string, toIndex: number) => void,
  onReorderItems: (categoryId: string, items: T[]) => void,
  getItemFromId: (itemId: string, categoryId: string) => T | undefined,
  getCategoryItems: (categoryId: string) => T[]
) {
  const [dragState, setDragState] = useState<DragState<{ itemId: string; categoryId: string }>>({
    draggedItem: null,
    dragOverCategory: null,
    dragOverItem: null,
  });

  const handlers: DragHandlers<{ itemId: string; categoryId: string }> = {
    onItemDragStart: (item, categoryId) => {
      setDragState(prev => ({
        ...prev,
        draggedItem: { itemId: item.itemId, categoryId }
      }));
    },

    onItemDragEnd: () => {
      setDragState({
        draggedItem: null,
        dragOverCategory: null,
        dragOverItem: null,
      });
    },

    onCategoryDragOver: (e, categoryId) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragState(prev => ({
        ...prev,
        dragOverCategory: categoryId
      }));
    },

    onCategoryDragLeave: (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragState(prev => ({
          ...prev,
          dragOverCategory: null
        }));
      }
    },

    onCategoryDrop: (e, toCategoryId) => {
      e.preventDefault();
      const { draggedItem } = dragState;
      
      if (!draggedItem || draggedItem.categoryId === toCategoryId) {
        setDragState({
          draggedItem: null,
          dragOverCategory: null,
          dragOverItem: null,
        });
        return;
      }

      // 移动项目到分类开头
      onMoveItem(draggedItem.itemId, draggedItem.categoryId, toCategoryId, 0);
      
      setDragState({
        draggedItem: null,
        dragOverCategory: null,
        dragOverItem: null,
      });
    },

    onItemDragOver: (e, item, categoryId) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragState(prev => ({
        ...prev,
        dragOverItem: { itemId: item.itemId, categoryId }
      }));
    },

    onItemDragLeave: (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragState(prev => ({
          ...prev,
          dragOverItem: null
        }));
      }
    },

    onItemDrop: (e, targetItem, targetCategoryId) => {
      e.preventDefault();
      const { draggedItem } = dragState;
      
      if (!draggedItem || draggedItem.itemId === targetItem.itemId) {
        setDragState({
          draggedItem: null,
          dragOverCategory: null,
          dragOverItem: null,
        });
        return;
      }

      const targetCategoryItems = getCategoryItems(targetCategoryId);
      if (!targetCategoryItems) {
        setDragState({
          draggedItem: null,
          dragOverCategory: null,
          dragOverItem: null,
        });
        return;
      }

      const targetIndex = targetCategoryItems.findIndex(item => item.id === targetItem.itemId);
      
      if (draggedItem.categoryId === targetCategoryId) {
        // 同分类内重排序
        const sourceIndex = targetCategoryItems.findIndex(item => item.id === draggedItem.itemId);
        if (sourceIndex !== -1 && targetIndex !== -1) {
          const newItems = [...targetCategoryItems];
          const [movedItem] = newItems.splice(sourceIndex, 1);
          newItems.splice(targetIndex, 0, movedItem);
          onReorderItems(targetCategoryId, newItems);
        }
      } else {
        // 跨分类移动
        onMoveItem(draggedItem.itemId, draggedItem.categoryId, targetCategoryId, targetIndex);
      }
      
      setDragState({
        draggedItem: null,
        dragOverCategory: null,
        dragOverItem: null,
      });
    },
  };

  return {
    dragState,
    handlers,
  };
}

// 拖拽容器组件
interface DragContainerProps {
  children: React.ReactNode;
  categoryId: string;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  className?: string;
}

export const DragContainer: React.FC<DragContainerProps> = ({
  children,
  categoryId,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  className = '',
}) => {
  return (
    <div
      className={`${isDragOver ? 'drag-item-drop-target' : ''} ${className}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
};

// 可拖拽项目组件
interface DragItemProps {
  children: React.ReactNode;
  itemId: string;
  categoryId: string;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  className?: string;
}

export const DragItem: React.FC<DragItemProps> = ({
  children,
  itemId,
  categoryId,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  className = '',
}) => {
  return (
    <div
      className={`${isDragging ? 'bookmark-item-being-dragged' : ''} ${isDropTarget ? 'bookmark-item-drop-target' : ''} ${className}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {children}
      </div>
    </div>
  );
};

// 可拖拽图标组件
interface DragHandleProps {
  children: React.ReactNode;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  title?: string;
  style?: React.CSSProperties;
}

export const DragHandle: React.FC<DragHandleProps> = ({
  children,
  isDragging,
  onDragStart,
  onDragEnd,
  title = "拖拽排序",
  style = {},
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: '2px',
        padding: '2px',
        ...style,
      }}
      title={title}
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
      {children}
    </div>
  );
};
