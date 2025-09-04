import * as vscode from 'vscode';
import { getWebviewHtml } from './webviewHtml';
import * as path from 'path';
import {
  ProjectConfig,
  getConfigFilePath,
  getConfigDirectory,
  loadConfig,
  saveConfig,
  initializeConfig,
} from './config';

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

