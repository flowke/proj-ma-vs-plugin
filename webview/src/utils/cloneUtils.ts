import type { RepositoryItem, AddedDirectory } from '../types';
import { extractRepoInfo } from './repositoryUtils';
import { postMessage } from '../vscode-api';

/**
 * 解析各种格式的仓库地址
 * 支持的格式：
 * - https://github.com/flowke/puta
 * - https://github.com/flowke/puta.git
 * - git@github.com:flowke/puta.git
 */
export function parseRepositoryInput(input: string): {
  name: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  cloneUrls: { https?: string; ssh?: string };
  originalUrl: string;
} {
  const trimmedInput = input.trim();
  
  // 处理 SSH 格式: git@github.com:flowke/puta.git
  if (trimmedInput.startsWith('git@')) {
    return parseSshUrl(trimmedInput);
  }
  
  // 处理 HTTPS 格式
  if (trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')) {
    return parseHttpsUrl(trimmedInput);
  }
  
  // 如果没有协议前缀，假设是 HTTPS
  if (!trimmedInput.includes('://')) {
    const httpsUrl = trimmedInput.startsWith('github.com') || trimmedInput.startsWith('gitlab.com') || trimmedInput.startsWith('bitbucket.org')
      ? `https://${trimmedInput}`
      : `https://github.com/${trimmedInput}`;
    return parseHttpsUrl(httpsUrl);
  }
  
  // 默认情况，尝试作为 HTTPS URL 处理
  return parseHttpsUrl(trimmedInput);
}

/**
 * 解析 SSH 格式的 URL
 * 例如: git@github.com:flowke/puta.git
 */
function parseSshUrl(sshUrl: string): {
  name: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  cloneUrls: { https?: string; ssh?: string };
  originalUrl: string;
} {
  try {
    // 解析 SSH URL: git@hostname:owner/repo.git
    const match = sshUrl.match(/^git@([^:]+):(.+)$/);
    if (!match) {
      throw new Error('Invalid SSH URL format');
    }
    
    const [, hostname, repoPath] = match;
    
    // 去掉可能的 .git 后缀
    const cleanRepoPath = repoPath.endsWith('.git') ? repoPath.slice(0, -4) : repoPath;
    const pathParts = cleanRepoPath.split('/');
    
    if (pathParts.length < 2) {
      throw new Error('Invalid repository path in SSH URL');
    }
    
    const repoName = pathParts[pathParts.length - 1];
    const ownerRepo = pathParts.slice(0, 2).join('/');
    
    // 确定提供商
    let provider: 'github' | 'gitlab' | 'bitbucket' | 'other' = 'other';
    if (hostname.includes('github.com')) {
      provider = 'github';
    } else if (hostname.includes('gitlab.com') || hostname.includes('gitlab.')) {
      provider = 'gitlab';
    } else if (hostname.includes('bitbucket.org')) {
      provider = 'bitbucket';
    }
    
    // 生成克隆地址
    const cloneUrls = {
      ssh: `git@${hostname}:${ownerRepo}.git`,
      https: `https://${hostname}/${ownerRepo}.git`,
    };
    
    return {
      name: repoName,
      provider,
      cloneUrls,
      originalUrl: sshUrl,
    };
  } catch (error) {
    console.error('Error parsing SSH URL:', error);
    return {
      name: sshUrl,
      provider: 'other',
      cloneUrls: { ssh: sshUrl },
      originalUrl: sshUrl,
    };
  }
}

/**
 * 解析 HTTPS 格式的 URL
 */
function parseHttpsUrl(httpsUrl: string): {
  name: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  cloneUrls: { https?: string; ssh?: string };
  originalUrl: string;
} {
  try {
    // 确保 URL 有协议
    let url = httpsUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const { name, provider, cloneUrls } = extractRepoInfo(url);
    
    return {
      name,
      provider,
      cloneUrls,
      originalUrl: httpsUrl,
    };
  } catch (error) {
    console.error('Error parsing HTTPS URL:', error);
    return {
      name: httpsUrl,
      provider: 'other',
      cloneUrls: { https: httpsUrl },
      originalUrl: httpsUrl,
    };
  }
}

/**
 * 克隆仓库到指定目录
 */
export function cloneRepositoryToDirectory(
  repositoryInfo: {
    name: string;
    cloneUrls: { https?: string; ssh?: string };
  },
  targetDirectory: AddedDirectory,
  cloneType: 'https' | 'ssh' = 'https'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cloneUrl = repositoryInfo.cloneUrls?.[cloneType];
    if (!cloneUrl) {
      reject(new Error(`无法获取 ${cloneType.toUpperCase()} 克隆地址`));
      return;
    }

    // 将URI转换为文件系统路径
    let targetPath = targetDirectory.uri;
    if (targetPath.startsWith('file://')) {
      targetPath = decodeURIComponent(targetPath.replace('file://', ''));
    }

    // 发送克隆请求
    postMessage({ 
      type: 'cloneRepository', 
      payload: { 
        url: cloneUrl, 
        name: repositoryInfo.name,
        cloneType,
        targetDirectory: targetPath
      } 
    });

    // 这里返回 Promise，实际的成功/失败需要通过消息监听处理
    resolve();
  });
}

/**
 * 查找包含指定路径的父目录
 */
export function findParentDirectory(
  targetPath: string,
  addedDirectories: AddedDirectory[]
): AddedDirectory | null {
  return addedDirectories.find(dir => {
    // 将URI转换为路径进行比较
    let dirPath = dir.uri;
    if (dirPath.startsWith('file://')) {
      dirPath = decodeURIComponent(dirPath.replace('file://', ''));
    }
    return targetPath.includes(dirPath) || dirPath.includes(targetPath);
  }) || null;
}

/**
 * 刷新父目录
 */
export function refreshParentDirectory(
  cloneDirectory: string,
  addedDirectories: AddedDirectory[]
): void {
  const parentDirectory = findParentDirectory(cloneDirectory, addedDirectories);
  
  if (parentDirectory) {
    console.log('[CloneUtils] 自动刷新父目录:', parentDirectory.name);
    
    // 延迟刷新，确保克隆完全完成
    setTimeout(() => {
      postMessage({ 
        type: 'refreshDirectory', 
        payload: { uri: parentDirectory.uri } 
      });
    }, 1000);
  }
}

/**
 * 验证仓库地址格式
 */
export function validateRepositoryUrl(input: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return { isValid: false, error: '请输入仓库地址' };
  }
  
  // SSH 格式验证
  if (trimmedInput.startsWith('git@')) {
    const sshPattern = /^git@[^:]+:.+$/;
    if (!sshPattern.test(trimmedInput)) {
      return { isValid: false, error: 'SSH格式不正确，应为: git@hostname:owner/repo.git' };
    }
    return { isValid: true };
  }
  
  // HTTPS 格式验证
  try {
    let url = trimmedInput;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 2) {
      return { isValid: false, error: '仓库地址应包含用户名和仓库名，如: owner/repo' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: '无效的URL格式' };
  }
}
