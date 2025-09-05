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
async function createBookmarkQuick(targetUrl: string): Promise<{success: boolean; error?: string; bookmark?: any}> {
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
    const existingBookmark = (config.bookmarks || []).find((bookmark: any) => bookmark.url === targetUrl);
    if (existingBookmark) {
      return { success: false, error: '书签已存在' };
    }

    // 添加新书签
    const updatedConfig = {
      ...config,
      bookmarks: [...(config.bookmarks || []), quickBookmark],
    };

    // 保存配置
    await saveConfig(updatedConfig);

    console.log('[Extension] Quick bookmark created:', quickBookmark);
    return { success: true, bookmark: quickBookmark };

  } catch (error: any) {
    console.error('[Extension] Error creating quick bookmark:', error);
    return { success: false, error: `创建书签失败: ${error.message}` };
  }
}

// 重新解析书签信息
async function reparseBookmarkInfo(bookmarkId: string, targetUrl: string, webview: vscode.Webview): Promise<void> {
  try {
    console.log('[Extension] Reparsing bookmark info for:', bookmarkId, targetUrl);
    
    // 先设置书签为解析中状态
    const config = await loadConfig();
    const updatedConfig = {
      ...config,
      bookmarks: (config.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? { ...bookmark, isParsing: true }
          : bookmark
      ),
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
    const updatedConfig = {
      ...config,
      bookmarks: (config.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? { ...bookmark, isParsing: false }
          : bookmark
      ),
    };
    await saveConfig(updatedConfig);
  }
}

// 后台解析书签信息
async function parseBookmarkInfoInBackground(bookmarkId: string, targetUrl: string, webview: vscode.Webview): Promise<void> {
  try {
    console.log('[Extension] Parsing bookmark info in background for:', targetUrl);
    
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
    const updatedConfig = {
      ...config,
      bookmarks: (config.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? {
              ...bookmark,
              title,
              icon,
              isParsing: false, // 解析完成
            }
          : bookmark
      ),
    };

    await saveConfig(updatedConfig);
    console.log('[Extension] Bookmark info parsed and updated:', { bookmarkId, title, icon });
    
    // 发送书签更新消息
    webview.postMessage({
      type: 'bookmarkUpdated',
      payload: { bookmarkId, title, icon }
    });

  } catch (error) {
    console.error('[Extension] Error parsing bookmark info in background:', error);
    
    // 解析失败时，移除解析中状态
    const config = await loadConfig();
    const updatedConfig = {
      ...config,
      bookmarks: (config.bookmarks || []).map((bookmark: any) => 
        bookmark.id === bookmarkId 
          ? {
              ...bookmark,
              isParsing: false, // 解析失败，移除解析中状态
            }
          : bookmark
      ),
    };

    await saveConfig(updatedConfig);
  }
}

// 获取网页信息并直接创建书签的函数
async function fetchWebsiteInfoAndCreateBookmark(targetUrl: string): Promise<{success: boolean; error?: string; bookmark?: any}> {
  try {
    console.log('[Extension] Fetching website info for:', targetUrl);
    
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
    const existingBookmark = (config.bookmarks || []).find((bookmark: any) => bookmark.url === targetUrl);
    if (existingBookmark) {
      return { success: false, error: '书签已存在' };
    }

    // 添加新书签
    const updatedConfig = {
      ...config,
      bookmarks: [...(config.bookmarks || []), newBookmark],
    };

    // 保存配置
    await saveConfig(updatedConfig);

    console.log('[Extension] Bookmark created successfully:', newBookmark);
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
      const existingBookmark = (config.bookmarks || []).find((bookmark: any) => bookmark.url === targetUrl);
      if (existingBookmark) {
        return { success: false, error: '书签已存在' };
      }

      const updatedConfig = {
        ...config,
        bookmarks: [...(config.bookmarks || []), defaultBookmark],
      };

      await saveConfig(updatedConfig);
      console.log('[Extension] Default bookmark created:', defaultBookmark);
      return { success: true, bookmark: defaultBookmark, error: `获取网页信息失败，已使用默认信息: ${error.message}` };
      
    } catch (parseError) {
      return { success: false, error: `无法创建书签: ${error.message}` };
    }
  }
}

function setupWebviewMessaging(webview: vscode.Webview, context: vscode.ExtensionContext) {
  const disposable = webview.onDidReceiveMessage(async (message) => {
    console.log('[Extension] received message from webview:', message);
    const kind = message?.type ?? message?.command;
    console.log('[Extension] extracted kind:', kind);
    
    if (kind === 'alert' && typeof message?.text === 'string') {
      vscode.window.showInformationMessage(`[Webview] ${message.text}`);
      return;
    }
    
    if (kind === 'webviewReady') {
      console.log('[Extension] webviewReady received, replying hello');
      await webview.postMessage({ type: 'helloFromExtension', command: 'helloFromExtension' });
      return;
    }
    
    if (kind === 'loadConfig') {
      console.log('[Extension] loading config...');
      const config = await loadConfig();
      await webview.postMessage({
        type: 'configLoaded',
        payload: config,
      });
      return;
    }
    
    if (kind === 'saveConfig') {
      console.log('[Extension] saving config...', JSON.stringify(message.payload, null, 2));
      await saveConfig(message.payload);
      console.log('[Extension] config saved successfully');
      return;
    }
    
    if (kind === 'openConfigLocation') {
      console.log('[Extension] opening config location...');
      const configDir = getConfigDirectory();
      try {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(configDir));
        console.log('[Extension] Successfully opened config location:', configDir);
      } catch (error) {
        console.error('[Extension] Error opening config location:', error);
        vscode.window.showErrorMessage(`打开配置文件位置失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'openConfigFile') {
      console.log('[Extension] opening config file...');
      const configPath = getConfigFilePath();
      try {
        // 确保配置文件存在
        await loadConfig(); // 这会自动创建配置文件如果不存在
        const uri = vscode.Uri.file(configPath);
        await vscode.commands.executeCommand('vscode.open', uri);
        console.log('[Extension] Successfully opened config file:', configPath);
      } catch (error) {
        console.error('[Extension] Error opening config file:', error);
        vscode.window.showErrorMessage(`打开配置文件失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'pickFolder') {
      console.log('[Extension] opening folder picker...');
      const selection = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: '选择文件夹',
      });
      if (!selection || selection.length === 0) {
        console.log('[Extension] user cancelled folder picking');
        return;
      }
      const folderUri = selection[0];
      console.log('[Extension] selected folder:', folderUri.fsPath);
      const entries = await vscode.workspace.fs.readDirectory(folderUri);
      const subfolders = entries
        .filter(([, type]) => type === vscode.FileType.Directory)
        .map(([name]) => {
          const childUri = vscode.Uri.joinPath(folderUri, name);
          return { name, uri: childUri.toString() };
        });
      const folderName = path.basename(folderUri.fsPath);
      console.log('[Extension] subfolders:', subfolders);
      await webview.postMessage({
        type: 'pickedFolder',
        command: 'pickedFolder',
        payload: {
          uri: folderUri.toString(),
          name: folderName,
          subfolders,
        },
      });
      console.log('[Extension] posted pickedFolder back to webview');
      return;
    }
    
    if (kind === 'refreshDirectory') {
      console.log('[Extension] refreshing directory...');
      const directoryUri = message.payload?.uri;
      if (!directoryUri) {
        console.error('[Extension] No directory URI provided for refresh');
        return;
      }
      
      try {
        const folderUri = vscode.Uri.parse(directoryUri);
        console.log('[Extension] refreshing folder:', folderUri.fsPath);
        
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
        
        console.log('[Extension] refreshed subfolders:', subfolders);
        await webview.postMessage({
          type: 'directoryRefreshed',
          payload: {
            uri: directoryUri,
            subfolders,
          },
        });
        console.log('[Extension] posted directoryRefreshed back to webview');
      } catch (error) {
        console.error('[Extension] Error refreshing directory:', error);
        vscode.window.showErrorMessage(`刷新目录失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'openTerminal') {
      console.log('[Extension] opening terminal...');
      const directoryUri = message.payload?.uri;
      if (!directoryUri) {
        console.error('[Extension] No directory URI provided for terminal');
        return;
      }
      
      try {
        const folderUri = vscode.Uri.parse(directoryUri);
        console.log('[Extension] opening terminal at:', folderUri.fsPath);
        
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
        
        console.log('[Extension] terminal opened successfully');
      } catch (error) {
        console.error('[Extension] Error opening terminal:', error);
        vscode.window.showErrorMessage(`打开终端失败: ${error}`);
      }
      return;
    }
    
    if (kind === 'openInEditor') {
      console.log('[Extension] opening in editor...');
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
        console.log('[Extension] opening in editor:', editor, 'at:', folderUri.fsPath);
        
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
        
        console.log('[Extension] Executing command:', command, args);
        
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
          console.log('[Extension] Process exited with code:', code);
          if (code === 0) {
            console.log('[Extension] Successfully opened in editor:', editor);
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
      console.log('[Extension] creating bookmark quickly...');
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
        console.log('[Extension] Creating quick bookmark for:', url);
        const result = await createBookmarkQuick(url);
        console.log('[Extension] Quick bookmark creation result:', result);
        
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
          console.log('[Extension] Starting background parsing for bookmark:', result.bookmark.id);
          // 不等待解析完成，立即返回
          parseBookmarkInfoInBackground(result.bookmark.id, url, webview).then(() => {
            // 解析完成后发送更新
            console.log('[Extension] Background parsing completed, sending config update');
            loadConfig().then(config => {
              console.log('[Extension] Sending configLoaded message with updated bookmarks:', config.bookmarks);
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
      console.log('[Extension] adding bookmark...');
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
        console.log('[Extension] Creating bookmark for:', url);
        const result = await fetchWebsiteInfoAndCreateBookmark(url);
        console.log('[Extension] Bookmark creation result:', result);
        
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
      console.log('[Extension] reparsing bookmark...');
      const bookmarkId = message.payload?.bookmarkId;
      const url = message.payload?.url;
      
      if (!bookmarkId || !url) {
        console.error('[Extension] Missing bookmarkId or url for reparseBookmark');
        return;
      }
      
      try {
        // 异步执行重新解析，不等待完成
        reparseBookmarkInfo(bookmarkId, url, webview);
        console.log('[Extension] Bookmark reparsing started for:', bookmarkId);
      } catch (error) {
        console.error('[Extension] Error starting bookmark reparsing:', error);
      }
      return;
    }
    
    if (kind === 'openUrl') {
      console.log('[Extension] opening URL...');
      const url = message.payload?.url;
      if (!url) {
        console.error('[Extension] No URL provided');
        vscode.window.showErrorMessage('没有提供URL');
        return;
      }
      
      try {
        await vscode.env.openExternal(vscode.Uri.parse(url));
        console.log('[Extension] Successfully opened URL:', url);
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
  console.log('[Extension] Activating proj-ma extension...');
  
  // 初始化配置文件
  initializeConfig();

  const provider = new ProjMaViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ProjMaViewProvider.viewType, provider)
  );
  
  console.log('[Extension] proj-ma extension activated successfully');
}


export function deactivate() { }

