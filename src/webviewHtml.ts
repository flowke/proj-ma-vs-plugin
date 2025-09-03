import * as vscode from 'vscode';

export function getWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview
): string {
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'assets', 'index.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'assets', 'index.css'));

  const cspSource = webview.cspSource;
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; script-src 'nonce-${nonce}' ${cspSource}; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Proj MA</title>
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

