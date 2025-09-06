import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 配置文件相关的类型定义
export interface ProjectConfig {
  version: string;
  favorites: any[];
  recentlyOpened: any[];
  addedDirectories: any[];
  bookmarkCategories: any[];
  repositories: any[];
  settings: {
    maxRecentItems: number;
    [key: string]: any;
  };
}

export const DEFAULT_CONFIG: ProjectConfig = {
  version: '1.0.0',
  favorites: [],
  recentlyOpened: [],
  addedDirectories: [],
  bookmarkCategories: [{
    id: 'default',
    name: '未分类',
    collapsed: false,
    bookmarks: [],
    createdAt: new Date().toISOString(),
  }],
  repositories: [],
  settings: {
    maxRecentItems: 20,
  },
};

// 获取配置文件路径
export function getConfigFilePath(): string {
  return path.join(os.homedir(), '.proj-ma.json');
}

// 加载配置文件
export async function loadConfig(): Promise<ProjectConfig> {
  const configPath = getConfigFilePath();
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      
      // 处理从旧的 bookmarks 到新的 bookmarkCategories 的数据迁移
      let bookmarkCategories = config.bookmarkCategories || DEFAULT_CONFIG.bookmarkCategories;
      
      // 如果存在旧的 bookmarks 结构而没有新的 bookmarkCategories
      if (config.bookmarks && !config.bookmarkCategories) {
        const defaultCategory = {
          id: 'default',
          name: '未分类',
          collapsed: false,
          bookmarks: config.bookmarks || [],
          createdAt: new Date().toISOString(),
        };
        bookmarkCategories = [defaultCategory];
      }
      
      // 深度合并配置，确保新添加的字段有默认值
      const mergedConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        settings: {
          ...DEFAULT_CONFIG.settings,
          ...(config.settings || {}),
        },
        // 确保数组字段总是存在
        favorites: config.favorites || DEFAULT_CONFIG.favorites,
        recentlyOpened: config.recentlyOpened || DEFAULT_CONFIG.recentlyOpened,
        addedDirectories: config.addedDirectories || DEFAULT_CONFIG.addedDirectories,
        bookmarkCategories,
        repositories: config.repositories || DEFAULT_CONFIG.repositories,
      };
      
      return mergedConfig;
    } else {
      // 如果配置文件不存在，创建默认配置文件
      await saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('[Config] Error loading config:', error);
    // 出错时也创建默认配置
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

// 保存配置文件
export async function saveConfig(config: ProjectConfig): Promise<void> {
  const configPath = getConfigFilePath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('[Config] Error saving config:', error);
    vscode.window.showErrorMessage(`保存配置文件失败: ${error}`);
  }
}

// 初始化配置文件
export async function initializeConfig(): Promise<void> {
  try {
    const configPath = getConfigFilePath();
    
    if (!fs.existsSync(configPath)) {
      await saveConfig(DEFAULT_CONFIG);
    } else {
      // 验证配置文件格式，如果损坏则重新创建
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        JSON.parse(content);
      } catch (parseError) {
        console.warn('[Config] Config file is corrupted, recreating...', parseError);
        await saveConfig(DEFAULT_CONFIG);
      }
    }
  } catch (error) {
    console.error('[Config] Error initializing config:', error);
    vscode.window.showErrorMessage(`初始化配置文件失败: ${error}`);
  }
}

// 获取配置文件目录路径
export function getConfigDirectory(): string {
  return path.dirname(getConfigFilePath());
}

// 检查配置文件是否存在
export function configFileExists(): boolean {
  return fs.existsSync(getConfigFilePath());
}

// 验证配置文件格式
export function validateConfig(config: any): config is ProjectConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof config.version === 'string' &&
    Array.isArray(config.favorites) &&
    Array.isArray(config.recentlyOpened) &&
    Array.isArray(config.addedDirectories) &&
    Array.isArray(config.bookmarkCategories || []) &&
    Array.isArray(config.repositories || []) &&
    typeof config.settings === 'object' &&
    config.settings !== null
  );
}
