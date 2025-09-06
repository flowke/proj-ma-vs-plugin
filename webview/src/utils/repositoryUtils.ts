import type { RepositoryItem } from '../types';

/**
 * 解析仓库克隆地址
 * @param url 仓库访问地址
 * @returns 包含 https 和 ssh 克隆地址的对象
 */
export function parseCloneUrls(url: string): { https?: string; ssh?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 提取路径部分，去掉开头的 /
    let pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    
    // 去掉可能的尾部斜杠
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    
    // 去掉可能的 .git 后缀
    if (pathname.endsWith('.git')) {
      pathname = pathname.slice(0, -4);
    }
    
    // 确保路径格式正确 (owner/repo)
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    if (pathParts.length < 2) {
      console.warn('Invalid repository path:', pathname);
      return {};
    }
    
    const repoPath = pathParts.slice(0, 2).join('/'); // 只取前两部分 (owner/repo)
    
    // GitHub
    if (hostname.includes('github.com')) {
      return {
        https: `https://github.com/${repoPath}.git`,
        ssh: `git@github.com:${repoPath}.git`,
      };
    }
    
    // GitLab.com
    if (hostname.includes('gitlab.com')) {
      return {
        https: `https://gitlab.com/${repoPath}.git`,
        ssh: `git@gitlab.com:${repoPath}.git`,
      };
    }
    
    // 自托管的 GitLab 实例
    if (hostname.includes('gitlab.') || urlObj.pathname.includes('/-/')) {
      return {
        https: `${urlObj.protocol}//${hostname}/${repoPath}.git`,
        ssh: `git@${hostname}:${repoPath}.git`,
      };
    }
    
    // Bitbucket
    if (hostname.includes('bitbucket.org')) {
      return {
        https: `https://bitbucket.org/${repoPath}.git`,
        ssh: `git@bitbucket.org:${repoPath}.git`,
      };
    }
    
    // 通用 Git 服务器（尝试构建标准的克隆地址）
    return {
      https: `${urlObj.protocol}//${hostname}/${repoPath}.git`,
      ssh: `git@${hostname}:${repoPath}.git`,
    };
    
  } catch (error) {
    console.error('Error parsing clone URLs:', error);
    return {};
  }
}

/**
 * 从仓库 URL 提取仓库信息
 * @param url 仓库访问地址
 * @returns 仓库信息对象
 */
export function extractRepoInfo(url: string): {
  name: string; 
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  cloneUrls: { https?: string; ssh?: string };
} {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    let provider: 'github' | 'gitlab' | 'bitbucket' | 'other' = 'other';
    if (hostname.includes('github.com')) {
      provider = 'github';
    } else if (hostname.includes('gitlab.com') || hostname.includes('gitlab.')) {
      provider = 'gitlab';
    } else if (hostname.includes('bitbucket.org')) {
      provider = 'bitbucket';
    }

    // 提取仓库名称
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    let name = url;
    
    if (pathParts.length >= 2) {
      // 通常格式是 /username/reponame
      name = pathParts[1];
      // 去除 .git 后缀
      if (name.endsWith('.git')) {
        name = name.slice(0, -4);
      }
    } else if (pathParts.length === 1) {
      name = pathParts[0];
    }

    // 解析克隆地址
    const cloneUrls = parseCloneUrls(url);

    return { name, provider, cloneUrls };
  } catch (error) {
    console.error('Error extracting repo info:', error);
    return { 
      name: url, 
      provider: 'other',
      cloneUrls: {}
    };
  }
}

/**
 * 更新仓库项的克隆地址
 * @param repository 仓库项
 * @returns 更新后的仓库项
 */
export function updateRepositoryCloneUrls(repository: RepositoryItem): RepositoryItem {
  const cloneUrls = parseCloneUrls(repository.url);
  return {
    ...repository,
    cloneUrls,
  };
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案：使用传统的复制方法
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}
