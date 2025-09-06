/**
 * 后台任务管理 Hook
 * 管理所有正在进行的后台任务状态
 */

import { useState, useCallback, useEffect } from 'react';

export interface BackgroundTask {
  id: string;
  type: 'clone' | 'refresh' | 'other';
  title: string;
  description: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number; // 0-100
  startTime: string;
  endTime?: string;
  error?: string;
  metadata?: Record<string, any>;
}

interface BackgroundTasksState {
  tasks: BackgroundTask[];
  activeTasks: BackgroundTask[];
  completedTasks: BackgroundTask[];
}

export function useBackgroundTasks() {
  const [state, setState] = useState<BackgroundTasksState>({
    tasks: [],
    activeTasks: [],
    completedTasks: [],
  });

  // 添加新任务
  const addTask = useCallback((task: Omit<BackgroundTask, 'id' | 'startTime'>) => {
    const newTask: BackgroundTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date().toISOString(),
    };

    setState(prev => {
      const tasks = [...prev.tasks, newTask];
      return {
        tasks,
        activeTasks: tasks.filter(t => t.status === 'running'),
        completedTasks: tasks.filter(t => t.status !== 'running'),
      };
    });

    return newTask.id;
  }, []);

  // 更新任务状态
  const updateTask = useCallback((taskId: string, updates: Partial<BackgroundTask>) => {
    setState(prev => {
      const tasks = prev.tasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              ...updates,
              endTime: (updates.status && updates.status !== 'running') ? new Date().toISOString() : task.endTime
            }
          : task
      );

      return {
        tasks,
        activeTasks: tasks.filter(t => t.status === 'running'),
        completedTasks: tasks.filter(t => t.status !== 'running'),
      };
    });
  }, []);

  // 移除任务
  const removeTask = useCallback((taskId: string) => {
    setState(prev => {
      const tasks = prev.tasks.filter(task => task.id !== taskId);
      return {
        tasks,
        activeTasks: tasks.filter(t => t.status === 'running'),
        completedTasks: tasks.filter(t => t.status !== 'running'),
      };
    });
  }, []);

  // 清除已完成的任务
  const clearCompletedTasks = useCallback(() => {
    setState(prev => {
      const tasks = prev.tasks.filter(task => task.status === 'running');
      return {
        tasks,
        activeTasks: tasks,
        completedTasks: [],
      };
    });
  }, []);

  // 获取任务统计信息
  const getTaskStats = useCallback(() => {
    return {
      total: state.tasks.length,
      active: state.activeTasks.length,
      completed: state.completedTasks.filter(t => t.status === 'completed').length,
      failed: state.completedTasks.filter(t => t.status === 'failed').length,
    };
  }, [state]);

  return {
    tasks: state.tasks,
    activeTasks: state.activeTasks,
    completedTasks: state.completedTasks,
    addTask,
    updateTask,
    removeTask,
    clearCompletedTasks,
    getTaskStats,
  };
}
