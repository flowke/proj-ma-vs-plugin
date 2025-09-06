import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import type { AddedDirectory } from '../types';
import { parseRepositoryInput, cloneRepositoryToDirectory, refreshParentDirectory } from '../utils/cloneUtils';

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

  // 监听克隆完成消息
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      
      if (msg?.type === 'cloneStarted' && msg.payload) {
        const { repository, cloneType } = msg.payload;
        message.success(`正在后台克隆仓库 "${repository}" (${cloneType.toUpperCase()})`);
      }
      
      if (msg?.type === 'cloneCompleted' && msg.payload) {
        const { repository, directory, success, error, exitCode } = msg.payload;
        
        // 清除克隆状态
        setCloneState({ isCloning: false });
        
        if (success) {
          message.success(`仓库 "${repository}" 克隆成功！`);
          
          // 自动刷新父目录
          refreshParentDirectory(directory, addedDirectories);
        } else {
          const errorMsg = error || `退出代码: ${exitCode}`;
          message.error(`仓库 "${repository}" 克隆失败: ${errorMsg}`);
          setCloneState({ 
            isCloning: false, 
            error: errorMsg 
          });
        }
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addedDirectories]);

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

      // 设置克隆状态
      setCloneState({ isCloning: true });

      // 执行克隆
      await cloneRepositoryToDirectory(repositoryInfo, targetDirectory, cloneType);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '克隆失败';
      message.error(errorMsg);
      setCloneState({ 
        isCloning: false, 
        error: errorMsg 
      });
    }
  }, [cloneState.isCloning]);

  const resetCloneState = useCallback(() => {
    setCloneState({ isCloning: false });
  }, []);

  return {
    cloneState,
    cloneRepository,
    resetCloneState,
  };
}
