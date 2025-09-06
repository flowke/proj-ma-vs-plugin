import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import type { AddedDirectory } from '../types';
import { parseRepositoryInput, cloneRepositoryToDirectory, refreshParentDirectory } from '../utils/cloneUtils';
import { useBackgroundTasksContext } from '../contexts/BackgroundTasksContext';

export interface CloneState {
  isCloning: boolean;
  error?: string;
}

export interface UseCloneReturn {
  cloneState: CloneState;
  cloneRepository: (
    input: string,
    targetDirectory: AddedDirectory,
    cloneType?: 'https' | 'ssh'
  ) => Promise<void>;
  resetCloneState: () => void;
}

export function useClone(addedDirectories: AddedDirectory[]): UseCloneReturn {
  const [cloneState, setCloneState] = useState<CloneState>({
    isCloning: false,
  });
  const { addTask, updateTask } = useBackgroundTasksContext();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // 监听克隆完成消息
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      
      if (msg?.type === 'cloneStarted' && msg.payload) {
        const { repository, cloneType, taskId } = msg.payload;
        message.success(`正在后台克隆仓库 "${repository}" (${cloneType.toUpperCase()})`);
        
        // 使用传递的任务ID或当前任务ID更新任务状态
        const targetTaskId = taskId || currentTaskId;
        if (targetTaskId) {
          updateTask(targetTaskId, {
            status: 'running',
            description: `使用 ${cloneType.toUpperCase()} 协议克隆中...`,
          });
          
          // 如果使用传递的任务ID，更新当前任务ID
          if (taskId && taskId !== currentTaskId) {
            setCurrentTaskId(taskId);
          }
        }
      }
      
      if (msg?.type === 'cloneCompleted' && msg.payload) {
        const { repository, directory, success, error, exitCode, taskId } = msg.payload;
        
        // 使用传递的任务ID或当前任务ID
        const targetTaskId = taskId || currentTaskId;
        
        // 清除克隆状态（只有在使用当前任务ID时才清除）
        if (!taskId || taskId === currentTaskId) {
          setCloneState({ isCloning: false });
          setCurrentTaskId(null);
        }
        
        if (success) {
          message.success(`仓库 "${repository}" 克隆成功！`);
          
          // 更新任务状态为完成
          if (targetTaskId) {
            updateTask(targetTaskId, {
              status: 'completed',
              description: '克隆完成',
              endTime: new Date().toISOString(),
            });
          }
          
          // 自动刷新父目录
          refreshParentDirectory(directory, addedDirectories);
        } else {
          const errorMsg = error || `退出代码: ${exitCode}`;
          message.error(`仓库 "${repository}" 克隆失败: ${errorMsg}`);
          
          // 更新任务状态为失败
          if (targetTaskId) {
            updateTask(targetTaskId, {
              status: 'failed',
              description: '克隆失败',
              error: errorMsg,
              endTime: new Date().toISOString(),
            });
          }
          
          // 只有在使用当前任务ID时才更新克隆状态
          if (!taskId || taskId === currentTaskId) {
            setCloneState({ 
              isCloning: false, 
              error: errorMsg 
            });
          }
        }
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addedDirectories, currentTaskId, updateTask]);

  const cloneRepository = useCallback(async (
    input: string,
    targetDirectory: AddedDirectory,
    cloneType: 'https' | 'ssh' = 'https'
  ) => {
    // 防止重复克隆
    if (cloneState.isCloning) {
      message.warning('正在进行克隆操作，请稍候...');
      return;
    }

    try {
      // 解析仓库信息
      const repositoryInfo = parseRepositoryInput(input);
      
      if (!repositoryInfo.cloneUrls[cloneType]) {
        throw new Error(`无法生成 ${cloneType.toUpperCase()} 克隆地址`);
      }

      // 创建后台任务
      const taskId = addTask({
        type: 'clone',
        title: `克隆 ${repositoryInfo.name}`,
        description: '准备开始克隆...',
        status: 'running',
        metadata: {
          repositoryName: repositoryInfo.name,
          repositoryUrl: repositoryInfo.url,
          targetDirectory: targetDirectory.name,
          cloneType: cloneType.toUpperCase(),
        },
      });

      // 设置当前任务ID和克隆状态
      setCurrentTaskId(taskId);
      setCloneState({ isCloning: true });

      // 执行克隆
      await cloneRepositoryToDirectory(repositoryInfo, targetDirectory, cloneType);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '克隆失败';
      message.error(errorMsg);
      
      // 保存任务ID用于更新状态
      const taskId = currentTaskId;
      
      // 更新任务状态为失败
      if (taskId) {
        updateTask(taskId, {
          status: 'failed',
          description: '克隆初始化失败',
          error: errorMsg,
        });
      }
      
      setCloneState({ 
        isCloning: false, 
        error: errorMsg 
      });
      setCurrentTaskId(null);
    }
  }, [cloneState.isCloning, addTask, updateTask, currentTaskId]);

  const resetCloneState = useCallback(() => {
    setCloneState({ isCloning: false });
  }, []);

  return {
    cloneState,
    cloneRepository,
    resetCloneState,
  };
}
