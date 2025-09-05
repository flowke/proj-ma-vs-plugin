// 配置文件类型定义
export interface ProjectConfig {
  // 版本号，用于配置文件升级
  version: string;
  
  // 收藏的条目
  favorites: FavoriteItem[];
  
  // 最近打开的条目
  recentlyOpened: RecentItem[];
  
  // 通过+号新增的目录
  addedDirectories: AddedDirectory[];
  
  // 网页书签
  bookmarks: BookmarkItem[];
  
  // 代码仓库
  repositories: RepositoryItem[];
  
  // 设置项
  settings: {
    // 最近打开列表的最大长度
    maxRecentItems: number;
    // 默认编辑器设置
    defaultEditor?: 'vscode' | 'cursor';
    // 其他设置可以在这里扩展
    [key: string]: any;
  };
}

export interface FavoriteItem {
  id: string;
  name: string;
  uri: string;
  type: 'directory' | 'file';
  addedAt: string; // ISO string
  tags?: string[];
}

export interface RecentItem {
  id: string;
  name: string;
  uri: string;
  type: 'directory' | 'file';
  lastOpenedAt: string; // ISO string
  openCount: number;
}

export interface AddedDirectory {
  id: string;
  name: string;
  uri: string;
  subfolders: Subfolder[];
  addedAt: string; // ISO string
}

export interface Subfolder {
  name: string;
  uri: string;
  isFavorite?: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  icon?: string; // favicon URL
  addedAt: string; // ISO string
  tags?: string[];
}

export interface RepositoryItem {
  id: string;
  name: string;
  url: string;
  provider?: 'github' | 'gitlab' | 'bitbucket' | 'other';
  description?: string;
  addedAt: string; // ISO string
  tags?: string[];
}

// VS Code API 类型
export type VSCodeApi = { postMessage: (message: any) => void } | undefined;

// 消息类型
export interface VSCodeMessage {
  type: 'webviewReady' | 'pickFolder' | 'openConfigLocation' | 'openConfigFile' | 'saveConfig' | 'loadConfig' | 'toggleFavorite' | 'refreshDirectory' | 'directoryRefreshed' | 'openTerminal' | 'openInEditor' | 'openUrl' | 'addBookmark' | 'bookmarkAdded';
  payload?: any;
}

// 默认配置
export const DEFAULT_CONFIG: ProjectConfig = {
  version: '1.0.0',
  favorites: [],
  recentlyOpened: [],
  addedDirectories: [],
  bookmarks: [],
  repositories: [],
  settings: {
    maxRecentItems: 20,
  },
};
