/**
 * 后台任务管理 Context
 * 为整个应用提供全局的后台任务状态管理
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useBackgroundTasks, BackgroundTask } from '../hooks/useBackgroundTasks';

interface BackgroundTasksContextType {
  tasks: BackgroundTask[];
  activeTasks: BackgroundTask[];
  completedTasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'startTime'>) => string;
  updateTask: (taskId: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (taskId: string) => void;
  clearCompletedTasks: () => void;
  getTaskStats: () => {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
}

const BackgroundTasksContext = createContext<BackgroundTasksContextType | undefined>(undefined);

interface BackgroundTasksProviderProps {
  children: ReactNode;
}

export function BackgroundTasksProvider({ children }: BackgroundTasksProviderProps) {
  const tasksState = useBackgroundTasks();

  return (
    <BackgroundTasksContext.Provider value={tasksState}>
      {children}
    </BackgroundTasksContext.Provider>
  );
}

export function useBackgroundTasksContext() {
  const context = useContext(BackgroundTasksContext);
  if (context === undefined) {
    throw new Error('useBackgroundTasksContext must be used within a BackgroundTasksProvider');
  }
  return context;
}
