import * as vscode from 'vscode';
import { getWebviewHtml } from './webviewHtml';
import * as path from 'path';

function setupWebviewMessaging(webview: vscode.Webview, context: vscode.ExtensionContext) {
  const disposable = webview.onDidReceiveMessage(async (message) => {
    console.log('[Extension] received message from webview:', message);
    const kind = message?.type ?? message?.command;
    if (kind === 'alert' && typeof message?.text === 'string') {
      vscode.window.showInformationMessage(`[Webview] ${message.text}`);
      return;
    }
    if (kind === 'webviewReady') {
      console.log('[Extension] webviewReady received, replying hello');
      await webview.postMessage({ type: 'helloFromExtension', command: 'helloFromExtension' });
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
    }
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
  console.log('active');

  const provider = new ProjMaViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ProjMaViewProvider.viewType, provider)
  );
}

export function deactivate() { }

