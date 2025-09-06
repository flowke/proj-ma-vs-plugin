/**
 * 后台任务列表模态框组件
 * 显示所有正在进行和已完成的后台任务
 */

import React, { useState, useEffect } from 'react';
import { Modal, List, Progress, Tag, Button, Divider, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  LoadingOutlined, 
  ClockCircleOutlined,
  DeleteOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useBackgroundTasksContext } from '../contexts/BackgroundTasksContext';
import { BackgroundTask } from '../hooks/useBackgroundTasks';

interface TaskListModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TaskListModal({ open, onClose }: TaskListModalProps) {
  const { 
    activeTasks, 
    completedTasks, 
    getTaskStats, 
    removeTask, 
    clearCompletedTasks 
  } = useBackgroundTasksContext();

  const stats = getTaskStats();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 每秒更新一次当前时间，用于计算实时耗时
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 获取任务状态图标
  const getTaskStatusIcon = (task: BackgroundTask) => {
    switch (task.status) {
      case 'running':
        return <LoadingOutlined spin style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  // 获取任务状态标签
  const getTaskStatusTag = (task: BackgroundTask) => {
    const statusConfig: Record<BackgroundTask['status'], { color: string; text: string }> = {
      running: { color: 'blue', text: '进行中' },
      completed: { color: 'green', text: '已完成' },
      failed: { color: 'red', text: '失败' },
    };

    const config = statusConfig[task.status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '未知时间';
    }
  };

  // 计算任务持续时间
  const getTaskDuration = (task: BackgroundTask) => {
    const start = new Date(task.startTime);
    // 对于正在进行的任务使用实时时间，已完成的任务使用结束时间
    const end = task.endTime ? new Date(task.endTime) : currentTime;
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) {
      return `${duration}秒`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}分${duration % 60}秒`;
    } else {
      return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分`;
    }
  };

  // 渲染任务项
  const renderTaskItem = (task: BackgroundTask) => {
    // 根据任务状态设置边框颜色
    const getBorderColor = () => {
      switch (task.status) {
        case 'running':
          return 'var(--vscode-charts-blue)';
        case 'completed':
          return 'var(--vscode-charts-green)';
        case 'failed':
          return 'var(--vscode-charts-red)';
        default:
          return 'var(--vscode-panel-border)';
      }
    };

    return (
      <div
        key={task.id}
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: `1px solid ${getBorderColor()}`,
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '8px',
          position: 'relative',
          transition: 'all 0.2s ease',
          ...(task.status === 'failed' && {
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            borderWidth: '2px',
          }),
        }}
      >
      {/* 任务头部 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', // 改为顶部对齐，防止标签撑高时与删除按钮重叠
        justifyContent: 'space-between',
        marginBottom: '8px',
        gap: '12px' // 添加间隙确保不会重叠
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          flex: 1, // 让左侧内容占据剩余空间
          minWidth: 0 // 允许文字在必要时截断
        }}>
          {getTaskStatusIcon(task)}
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {task.title}
          </span>
          {getTaskStatusTag(task)}
        </div>
        
        {/* 删除按钮 */}
        {task.status !== 'running' && (
          <Tooltip title="删除任务">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeTask(task.id)}
              style={{ 
                color: 'var(--vscode-descriptionForeground)',
                fontSize: '12px',
                opacity: 0.7,
                padding: '4px',
                width: '24px',
                height: '24px',
                minWidth: '24px',
                flexShrink: 0, // 防止按钮被压缩
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
            />
          </Tooltip>
        )}
      </div>

      {/* 任务描述 */}
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--vscode-descriptionForeground)',
        marginBottom: '8px',
        lineHeight: '1.4'
      }}>
        {task.description}
      </div>

      {/* 元数据信息 */}
      {task.metadata && (
        <div style={{ 
          backgroundColor: 'var(--vscode-list-hoverBackground)',
          padding: '6px 8px',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          display: 'flex',
          gap: '12px'
        }}>
          <span>📂 {task.metadata.targetDirectory}</span>
          <span>🔗 {task.metadata.cloneType}</span>
        </div>
      )}


      {/* 错误信息 */}
      {task.status === 'failed' && task.error && (
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--vscode-errorForeground)',
          backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
          padding: '8px 10px',
          borderRadius: '4px',
          marginBottom: '8px',
          border: '1px solid var(--vscode-inputValidation-errorBorder)',
          display: 'flex',
          alignItems: 'flex-start', // 顶部对齐，防止图标和文字不对齐
          gap: '8px',
          wordBreak: 'break-word', // 允许长文本换行
          lineHeight: '1.4'
        }}>
          <CloseCircleOutlined style={{ 
            fontSize: '14px', 
            marginTop: '2px', // 微调图标位置
            flexShrink: 0 // 防止图标被压缩
          }} />
          <span style={{ flex: 1 }}>
            <strong>错误:</strong> {task.error}
          </span>
        </div>
      )}

      {/* 时间信息 */}
      <div style={{ 
        fontSize: '11px', 
        color: 'var(--vscode-descriptionForeground)',
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--vscode-panel-border)',
        paddingTop: '6px',
        marginTop: '6px'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          🕐 {formatTime(task.startTime)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⏱️ {getTaskDuration(task)}
        </span>
      </div>
    </div>
    );
  };

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingRight: '20px', // 给关闭按钮留出空间
          maxWidth: 'calc(100% - 40px)' // 限制标题宽度，避免与关闭按钮重叠
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>后台任务</span>
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--vscode-descriptionForeground)',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}>
            活动: {stats.active} | 完成: {stats.completed} | 失败: {stats.failed}
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderTop: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-editor-background)',
          borderBottomLeftRadius: '8px',  // 与Modal整体圆角保持一致
          borderBottomRightRadius: '8px', // 与Modal整体圆角保持一致
          marginTop: '0'
        }}>
          <Button
            icon={<ClearOutlined />}
            onClick={clearCompletedTasks}
            disabled={completedTasks.length === 0}
            style={{ 
              fontSize: '12px',
              height: '32px',
              padding: '0 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-secondaryForeground)',
              transition: 'all 0.2s ease'
            }}
          >
            清除已完成
          </Button>
          <Button 
            type="primary"
            onClick={onClose} 
            style={{ 
              fontSize: '12px',
              height: '32px',
              padding: '0 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--vscode-button-background)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-foreground)',
              transition: 'all 0.2s ease'
            }}
          >
            关闭
          </Button>
        </div>
      }
      width={600}
      style={{ top: 40 }}
      styles={{
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
        content: {
          backgroundColor: 'var(--vscode-editor-background)',
          padding: 0,
          borderRadius: '8px',
          overflow: 'hidden', // 确保内容不会溢出圆角
        },
        header: {
          backgroundColor: 'var(--vscode-editor-background)',
          borderBottom: '1px solid var(--vscode-panel-border)',
          padding: '16px 24px',
          margin: 0,
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        },
        body: {
          padding: '20px 24px',
          maxHeight: '60vh',
          overflow: 'auto',
          backgroundColor: 'var(--vscode-editor-background)',
        },
        footer: {
          padding: 0,
          margin: 0,
          backgroundColor: 'transparent', // 让footer div控制背景色
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
        },
      }}
      closeIcon={
        <span style={{ 
          color: 'var(--vscode-foreground)',
          fontSize: '16px',
          fontWeight: 'bold',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}>
          ✕
        </span>
      }
    >
      <div>
        {/* 活动任务 */}
        {activeTasks.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              padding: '8px 12px',
              backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
              borderRadius: '4px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <LoadingOutlined spin style={{ color: 'var(--vscode-charts-blue)' }} />
              正在进行的任务 ({activeTasks.length})
            </div>
            
            <div>
              {activeTasks.map(renderTaskItem)}
            </div>
          </div>
        )}

        {/* 已完成任务 */}
        {completedTasks.length > 0 && (
          <div>
            {activeTasks.length > 0 && (
              <Divider style={{ 
                margin: '20px 0', 
                borderColor: 'var(--vscode-panel-border)' 
              }} />
            )}
            
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              padding: '8px 12px',
              backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
              borderRadius: '4px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <ClockCircleOutlined style={{ color: 'var(--vscode-charts-gray)' }} />
              历史任务 ({completedTasks.length})
            </div>
            
            <div>
              {completedTasks.map(renderTaskItem)}
            </div>
          </div>
        )}

        {/* 无任务时的提示 */}
        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <div style={{ 
            textAlign: 'center',
            color: 'var(--vscode-descriptionForeground)',
            fontSize: '13px',
            padding: '60px 20px',
            backgroundColor: 'var(--vscode-editor-background)',
            borderRadius: '8px',
            border: '1px dashed var(--vscode-panel-border)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>
              📋
            </div>
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>
              暂无后台任务
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>
              执行克隆等操作时会在这里显示进度
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
