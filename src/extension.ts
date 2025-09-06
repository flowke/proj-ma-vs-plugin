import * as vscode from 'vscode';
import { getWebviewHtml } from './webviewHtml';
import * as path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';
import {
  ProjectConfig,
  getConfigFilePath,
  getConfigDirectory,
  loadConfig,
  saveConfig,
  initializeConfig,
} from './config';

// 快速创建书签（使用默认信息）
async function createBookmarkQuick(targetUrl: string, categoryId?: string): Promise<{success: boolean; error?: string; bookmark?: any; categoryId?: string}> {
  try {
    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.hostname.replace('www.', '');
    const title = domain.split('.')[0];
    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
    
    const quickBookmark = {
      id: Date.now().toString(),
      title: capitalizedTitle,
      url: targetUrl,
      icon: undefined, // 解析完成前不设置图标
      addedAt: new Date().toISOString(),
      isParsing: true, // 标记为解析中
    };

    // 加载当前配置
    const config = await loadConfig();
    
    // 检查是否已存在相同URL的书签
    const allBookmarks = (config.bookmarkCategories || []).flatMap((category: any) => category.bookmarks || []);
    const existingBookmark = allBookmarks.find((bookmark: any) => bookmark.url === targetUrl);
    if (existingBookmark) {
      return { success: false, error: '书签已存在' };
    }

    // 确定目标分类
    let targetCategoryId = categoryId || 'default';
    let targetCategory = (config.bookmarkCategories || []).find((cat: any) => cat.id === targetCategoryId);
    
    // 如果指定的分类不存在，使用默认分类
    if (!targetCategory) {
      targetCategory = (config.bookmarkCategories || []).find((cat: any) => cat.name === '未分类');
      targetCategoryId = targetCategory?.id || 'default';
    }
    
    // 如果还是没有找到，创建默认分类
    if (!targetCategory) {
      targetCategory = {
        id: 'default',
        name: '未分类',
        collapsed: false,
        bookmarks: [],
        createdAt: new Date().toISOString(),
      };
      config.bookmarkCategories = [...(config.bookmarkCategories || []), targetCategory];
    }

    // 添加新书签到指定分类
    const updatedCategories = (config.bookmarkCategories || []).map((category: any) => 
      category.id === targetCategoryId
        ? { ...category, bookmarks: [...(category.bookmarks || []), quickBookmark] }
        : category
    );

    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    // 保存配置
    await saveConfig(updatedConfig);

    return { success: true, bookmark: quickBookmark, categoryId: targetCategoryId };

  } catch (error: any) {
    console.error('[Extension] Error creating quick bookmark:', error);
    return { success: false, error: `创建书签失败: ${error.message}` };
  }
}

// 重新解析书签信息
async function reparseBookmarkInfo(bookmarkId: string, targetUrl: string, webview: vscode.Webview): Promise<void> {
  try {
    
    // 先设置书签为解析中状态
    const config = await loadConfig();
    const updatedCategories = (config.bookmarkCategories || []).map((category: any) => ({
      ...category,
      bookmarks: (category.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? { ...bookmark, isParsing: true }
          : bookmark
      )
    }));
    
    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };
    await saveConfig(updatedConfig);
    
    // 发送解析中状态更新
    webview.postMessage({
      type: 'bookmarkReparsing',
      payload: { bookmarkId }
    });
    
    // 开始重新解析
    await parseBookmarkInfoInBackground(bookmarkId, targetUrl, webview);
    
  } catch (error) {
    console.error('[Extension] Error reparsing bookmark:', error);
    
    // 解析失败时，移除解析中状态
    const config = await loadConfig();
    const updatedCategories = (config.bookmarkCategories || []).map((category: any) => ({
      ...category,
      bookmarks: (category.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? { ...bookmark, isParsing: false }
          : bookmark
      )
    }));
    
    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };
    await saveConfig(updatedConfig);
  }
}

// 后台解析书签信息
async function parseBookmarkInfoInBackground(bookmarkId: string, targetUrl: string, webview: vscode.Webview): Promise<void> {
  try {
    
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const htmlContent = response.data;
    const parsedUrl = new URL(targetUrl);
    
    // 解析 title
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '';
    
    // 清理HTML实体
    title = title
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
    
    // 如果title为空，尝试从h1标签获取
    if (!title) {
      const h1Match = htmlContent.match(/<h1[^>]*>([^<]*)<\/h1>/i);
      title = h1Match ? h1Match[1].trim() : '';
    }
    
    // 如果还是为空，使用域名
    if (!title) {
      title = parsedUrl.hostname.replace('www.', '');
    }

    // 解析 favicon
    let icon: string | undefined;
    
    // 查找各种类型的图标
    const iconPatterns = [
      /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)[^>]*href=["']([^"']*)/i,
      /<link[^>]*href=["']([^"']*)[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)/i,
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)/i,
    ];

    for (const pattern of iconPatterns) {
      const iconMatch = htmlContent.match(pattern);
      if (iconMatch) {
        let iconHref = iconMatch[1];
        if (iconHref.startsWith('//')) {
          iconHref = parsedUrl.protocol + iconHref;
        } else if (iconHref.startsWith('/')) {
          iconHref = `${parsedUrl.protocol}//${parsedUrl.hostname}${iconHref}`;
        } else if (!iconHref.startsWith('http')) {
          iconHref = `${parsedUrl.protocol}//${parsedUrl.hostname}/${iconHref}`;
        }
        icon = iconHref;
        break;
      }
    }

    // 如果没找到图标，尝试使用Google的favicon服务
    if (!icon) {
      icon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=16`;
    }

    // 更新书签信息
    const config = await loadConfig();
    const updatedCategories = (config.bookmarkCategories || []).map((category: any) => ({
      ...category,
      bookmarks: (category.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? {
              ...bookmark,
              title,
              icon,
              isParsing: false, // 解析完成
            }
          : bookmark
      )
    }));
    
    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    await saveConfig(updatedConfig);
    
    // 发送书签更新消息
    webview.postMessage({
      type: 'bookmarkUpdated',
      payload: { bookmarkId, title, icon }
    });

  } catch (error) {
    console.error('[Extension] Error parsing bookmark info in background:', error);
    
    // 解析失败时，移除解析中状态
    const config = await loadConfig();
    const updatedCategories = (config.bookmarkCategories || []).map((category: any) => ({
      ...category,
      bookmarks: (category.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? {
              ...bookmark,
              isParsing: false, // 解析失败，移除解析中状态
            }
          : bookmark
      )
    }));
    
    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    await saveConfig(updatedConfig);
  }
}

// 获取网页信息并直接创建书签的函数
async function fetchWebsiteInfoAndCreateBookmark(targetUrl: string): Promise<{success: boolean; error?: string; bookmark?: any}> {
  try {
    
    // 使用 axios 获取网页内容
    const response = await axios.get(targetUrl, {
      timeout: 10000, // 10秒超时

      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const htmlContent = response.data;
    const parsedUrl = new URL(targetUrl);
    
    // 解析 title
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '';
    
    // 清理HTML实体
    title = title
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
    
    // 如果title为空，尝试从h1标签获取
    if (!title) {
      const h1Match = htmlContent.match(/<h1[^>]*>([^<]*)<\/h1>/i);
      title = h1Match ? h1Match[1].trim() : '';
    }
    
    // 如果还是为空，使用域名
    if (!title) {
      title = parsedUrl.hostname.replace('www.', '');
    }

    // 解析 favicon
    let icon: string | undefined;
    
    // 查找各种类型的图标
    const iconPatterns = [
      /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)[^>]*href=["']([^"']*)/i,
      /<link[^>]*href=["']([^"']*)[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)/i,
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)/i,
    ];

    for (const pattern of iconPatterns) {
      const iconMatch = htmlContent.match(pattern);
      if (iconMatch) {
        let iconHref = iconMatch[1];
        if (iconHref.startsWith('//')) {
          iconHref = parsedUrl.protocol + iconHref;
        } else if (iconHref.startsWith('/')) {
          iconHref = `${parsedUrl.protocol}//${parsedUrl.hostname}${iconHref}`;
        } else if (!iconHref.startsWith('http')) {
          iconHref = `${parsedUrl.protocol}//${parsedUrl.hostname}/${iconHref}`;
        }
        icon = iconHref;
        break;
      }
    }

    // 如果没找到图标，使用默认的favicon路径
    if (!icon) {
      icon = `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`;
    }

    // 创建书签对象
    const newBookmark = {
      id: Date.now().toString(),
      title,
      url: targetUrl,
      icon,
      addedAt: new Date().toISOString(),
    };

    // 加载当前配置
    const config = await loadConfig();
    
    // 检查是否已存在相同URL的书签
    const allBookmarks = (config.bookmarkCategories || []).flatMap((category: any) => category.bookmarks || []);
    const existingBookmark = allBookmarks.find((bookmark: any) => bookmark.url === targetUrl);
    if (existingBookmark) {
      return { success: false, error: '书签已存在' };
    }

    // 获取默认分类
    let defaultCategory = (config.bookmarkCategories || []).find((cat: any) => cat.name === '未分类');
    if (!defaultCategory) {
      defaultCategory = {
        id: 'default',
        name: '未分类',
        collapsed: false,
        bookmarks: [],
        createdAt: new Date().toISOString(),
      };
      config.bookmarkCategories = [...(config.bookmarkCategories || []), defaultCategory];
    }

    // 添加新书签到默认分类
    const updatedCategories = (config.bookmarkCategories || []).map((category: any) => 
      category.id === defaultCategory.id
        ? { ...category, bookmarks: [...(category.bookmarks || []), newBookmark] }
        : category
    );

    const updatedConfig = {
      ...config,
      bookmarkCategories: updatedCategories,
    };

    // 保存配置
    await saveConfig(updatedConfig);

    return { success: true, bookmark: newBookmark };

  } catch (error: any) {
    console.error('[Extension] Error fetching website info:', error);
    
    // 生成默认书签
    try {
      const parsedUrl = new URL(targetUrl);
      const domain = parsedUrl.hostname.replace('www.', '');
      const title = domain.split('.')[0];
      const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
      
      const defaultBookmark = {
        id: Date.now().toString(),
        title: capitalizedTitle,
        url: targetUrl,
        icon: `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`,
        addedAt: new Date().toISOString(),
      };

      // 加载当前配置并添加默认书签
      const config = await loadConfig();
      const allBookmarks = (config.bookmarkCategories || []).flatMap((category: any) => category.bookmarks || []);
      const existingBookmark = allBookmarks.find((bookmark: any) => bookmark.url === targetUrl);
      if (existingBookmark) {
        return { success: false, error: '书签已存在' };
      }

      // 获取默认分类
      let defaultCategory = (config.bookmarkCategories || []).find((cat: any) => cat.name === '未分类');
      if (!defaultCategory) {
        defaultCategory = {
          id: 'default',
          name: '未分类',
          collapsed: false,
          bookmarks: [],
          createdAt: new Date().toISOString(),
        };
        config.bookmarkCategories = [...(config.bookmarkCategories || []), defaultCategory];
      }

      // 添加默认书签到默认分类
      const updatedCategories = (config.bookmarkCategories || []).map((category: any) => 
        category.id === defaultCategory.id
          ? { ...category, bookmarks: [...(category.bookmarks || []), defaultBookmark] }
          : category
      );

      const updatedConfig = {
        ...config,
        bookmarkCategories: updatedCategories,
      };

      await saveConfig(updatedConfig);
      return { success: true, bookmark: defaultBookmark, error: `获取网页信息失败，已使用默认信息: ${error.message}` };
      
    } catch (parseError) {
      return { success: false, error: `无法创建书签: ${error.message}` };
    }
  }
}

function setupWebviewMessaging(webview: vscode.Webview, context: vscode.ExtensionContext) {
  const disposable = webview.onDidReceiveMessage(async (message) => {
    const kind = message?.type ?? message?.command;
    
    if (kind === 'alert' && typeof message?.text === 'string') {
      vscode.window.showInformationMessage(`[Webview] ${message.text}`);
      return;
    }
    
    if (kind === 'webviewReady') {
      await webview.postMessage({ type: 'helloFromExtension', command: 'helloFromExtension' });
      return;
    }
    
    if (kind === 'loadConfig') {
      const config = await loadConfig();
      await webview.postMessage({
        type: 'configLoaded',
        payload: config,
      });
      return;
    }
    
    if (kind === 'saveConfig') {
      await saveConfig(message.payload);
      return;
    }
    
    if (kind === 'openConfigLocation') {
      const configDir = getConfigDirectory();
      try {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(configDir));
      } catch (error) {
        console.error('[Extension] Error opening config location:', error);
        vscode.window.showErrorMessage(`打开配置文件位置失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'openConfigFile') {
      const configPath = getConfigFilePath();
      try {
        // 确保配置文件存在
        await loadConfig(); // 这会自动创建配置文件如果不存在
        const uri = vscode.Uri.file(configPath);
        await vscode.commands.executeCommand('vscode.open', uri);
      } catch (error) {
        console.error('[Extension] Error opening config file:', error);
        vscode.window.showErrorMessage(`打开配置文件失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'pickFolder') {
      const selection = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: '选择文件夹',
      });
      if (!selection || selection.length === 0) {
        return;
      }
      const folderUri = selection[0];
      const entries = await vscode.workspace.fs.readDirectory(folderUri);
      const subfolders = entries
        .filter(([, type]) => type === vscode.FileType.Directory)
        .map(([name]) => {
          const childUri = vscode.Uri.joinPath(folderUri, name);
          return { name, uri: childUri.toString() };
        });
      const folderName = path.basename(folderUri.fsPath);
      await webview.postMessage({
        type: 'pickedFolder',
        command: 'pickedFolder',
        payload: {
          uri: folderUri.toString(),
          name: folderName,
          subfolders,
        },
      });
      return;
    }
    
    if (kind === 'refreshDirectory') {
      const directoryUri = message.payload?.uri;
      if (!directoryUri) {
        console.error('[Extension] No directory URI provided for refresh');
        return;
      }
      
      try {
        const folderUri = vscode.Uri.parse(directoryUri);
        
        // 检查目录是否仍然存在
        try {
          await vscode.workspace.fs.stat(folderUri);
        } catch (statError) {
          console.warn('[Extension] Directory no longer exists:', folderUri.fsPath);
          vscode.window.showWarningMessage(`目录不存在: ${folderUri.fsPath}`);
          return;
        }
        
        const entries = await vscode.workspace.fs.readDirectory(folderUri);
        const subfolders = entries
          .filter(([, type]) => type === vscode.FileType.Directory)
          .map(([name]) => {
            const childUri = vscode.Uri.joinPath(folderUri, name);
            return { name, uri: childUri.toString() };
          });
        
        await webview.postMessage({
          type: 'directoryRefreshed',
          payload: {
            uri: directoryUri,
            subfolders,
          },
        });
      } catch (error) {
        console.error('[Extension] Error refreshing directory:', error);
        vscode.window.showErrorMessage(`刷新目录失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'openTerminal') {
      const directoryUri = message.payload?.uri;
      if (!directoryUri) {
        console.error('[Extension] No directory URI provided for terminal');
        return;
      }
      
      try {
        const folderUri = vscode.Uri.parse(directoryUri);
        
        // 检查目录是否存在
        try {
          await vscode.workspace.fs.stat(folderUri);
        } catch (statError) {
          console.warn('[Extension] Directory no longer exists:', folderUri.fsPath);
          vscode.window.showWarningMessage(`目录不存在: ${folderUri.fsPath}`);
          return;
        }
        
        // 打开终端并设置工作目录
        const terminal = vscode.window.createTerminal({
          name: `Terminal - ${path.basename(folderUri.fsPath)}`,
          cwd: folderUri.fsPath
        });
        terminal.show();
        
      } catch (error) {
        console.error('[Extension] Error opening terminal:', error);
        vscode.window.showErrorMessage(`打开终端失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'openInEditor') {
      const directoryUri = message.payload?.uri;
      const editor = message.payload?.editor;
      
      if (!directoryUri) {
        console.error('[Extension] No directory URI provided for editor');
        return;
      }
      
      if (!editor || (editor !== 'vscode' && editor !== 'cursor')) {
        console.error('[Extension] Invalid editor specified:', editor);
        vscode.window.showErrorMessage(`无效的编辑器: ${editor}`);
        return;
      }
      
      try {
        const folderUri = vscode.Uri.parse(directoryUri);
        
        // 检查目录是否存在
        try {
          await vscode.workspace.fs.stat(folderUri);
        } catch (statError) {
          console.warn('[Extension] Directory no longer exists:', folderUri.fsPath);
          vscode.window.showWarningMessage(`目录不存在: ${folderUri.fsPath}`);
          return;
        }
        
        // 构建命令
        let command: string;
        let args: string[];
        
        if (editor === 'vscode') {
          command = 'code';
          args = [folderUri.fsPath];
        } else if (editor === 'cursor') {
          command = 'cursor';
          args = [folderUri.fsPath];
        } else {
          throw new Error(`Unsupported editor: ${editor}`);
        }
        
        
        // 使用 spawn 在后台静默执行命令
        const childProcess = spawn(command, args, {
          stdio: 'ignore', // 忽略标准输入输出，不显示任何输出
          detached: false, // 不分离进程
          shell: false, // 不使用shell，直接执行命令
        });
        
        childProcess.on('error', (error) => {
          console.error('[Extension] Process error:', error);
          throw error;
        });
        
        childProcess.on('exit', (code) => {
          if (code === 0) {
            vscode.window.showInformationMessage(`已在 ${editor === 'vscode' ? 'VS Code' : 'Cursor'} 中打开: ${path.basename(folderUri.fsPath)}`);
          } else {
            throw new Error(`编辑器进程退出，错误代码: ${code}`);
          }
        });
      } catch (error) {
        console.error('[Extension] Error opening in editor:', error);
        vscode.window.showErrorMessage(`在 ${editor === 'vscode' ? 'VS Code' : 'Cursor'} 中打开失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'createBookmarkQuick') {
      const url = message.payload?.url;
      if (!url) {
        console.error('[Extension] No URL provided for createBookmarkQuick');
        await webview.postMessage({
          type: 'bookmarkCreated',
          payload: { 
            success: false,
            error: '没有提供URL'
          },
        });
        return;
      }
      
      try {
        const categoryId = message.payload?.categoryId;
        const result = await createBookmarkQuick(url, categoryId);
        
        await webview.postMessage({
          type: 'bookmarkCreated',
          payload: result,
        });
        
        // 发送更新后的配置
        const config = await loadConfig();
        await webview.postMessage({
          type: 'configLoaded',
          payload: config,
        });
        
        // 如果创建成功，启动后台解析
        if (result.success && result.bookmark) {
          // 不等待解析完成，立即返回
          parseBookmarkInfoInBackground(result.bookmark.id, url, webview).then(() => {
            // 解析完成后发送更新
            loadConfig().then(config => {
              webview.postMessage({
                type: 'configLoaded',
                payload: config,
              });
            }).catch(error => {
              console.error('[Extension] Error loading config after parsing:', error);
            });
          }).catch(error => {
            console.error('[Extension] Error in background parsing:', error);
          });
        }
        
      } catch (error: any) {
        console.error('[Extension] Error creating quick bookmark:', error);
        await webview.postMessage({
          type: 'bookmarkCreated',
          payload: { 
            success: false,
            error: `创建书签失败: ${error.message}`
          },
        });
      }
      return;
    }
    
    if (kind === 'addBookmark') {
      const url = message.payload?.url;
      if (!url) {
        console.error('[Extension] No URL provided for addBookmark');
        await webview.postMessage({
          type: 'bookmarkAdded',
          payload: { 
            success: false,
            error: '没有提供URL'
          },
        });
        return;
      }
      
      try {
        const result = await fetchWebsiteInfoAndCreateBookmark(url);
        
        await webview.postMessage({
          type: 'bookmarkAdded',
          payload: result,
        });
        
        // 发送更新后的配置
        const config = await loadConfig();
        await webview.postMessage({
          type: 'configLoaded',
          payload: config,
        });
        
      } catch (error: any) {
        console.error('[Extension] Error creating bookmark:', error);
        await webview.postMessage({
          type: 'bookmarkAdded',
          payload: { 
            success: false,
            error: `创建书签失败: ${error.message}`
          },
        });
      }
      return;
    }
    
    if (kind === 'reparseBookmark') {
      const bookmarkId = message.payload?.bookmarkId;
      const url = message.payload?.url;
      
      if (!bookmarkId || !url) {
        console.error('[Extension] Missing bookmarkId or url for reparseBookmark');
        return;
      }
      
      try {
        // 异步执行重新解析，不等待完成
        reparseBookmarkInfo(bookmarkId, url, webview);
      } catch (error) {
        console.error('[Extension] Error starting bookmark reparsing:', error);
      }
      return;
    }
    
    if (kind === 'openUrl') {
      const url = message.payload?.url;
      if (!url) {
        console.error('[Extension] No URL provided');
        vscode.window.showErrorMessage('没有提供URL');
        return;
      }
      
      try {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      } catch (error) {
        console.error('[Extension] Error opening URL:', error);
        vscode.window.showErrorMessage(`打开链接失败: ${error}`);
      }
      return;
    }
    
    // 如果没有匹配的消息类型，记录警告
    console.warn('[Extension] Unhandled message type:', kind, 'Full message:', message);
  });
  // context.subscriptions.push(disposable);
}

class ProjMaViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'projMa.view';

  constructor(private readonly context: vscode.ExtensionContext) { }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview')
      ]
    };
    webviewView.webview.html = getWebviewHtml(this.context, webviewView.webview);
    setupWebviewMessaging(webviewView.webview, this.context);
    
  }
}

export function activate(context: vscode.ExtensionContext) {
  
  // 初始化配置文件
  initializeConfig();

  const provider = new ProjMaViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ProjMaViewProvider.viewType, provider)
  );
  
}


export function deactivate() { }

