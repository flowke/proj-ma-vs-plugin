// VS Code API 全局管理
type VSCodeApi = { postMessage: (message: any) => void } | undefined;

let globalVSCodeApi: VSCodeApi = undefined;

// 获取全局 VS Code API 实例
export function getVSCodeApi(): VSCodeApi {
  if (globalVSCodeApi) {
    return globalVSCodeApi;
  }

  try {
    const anyWindow = window as any;
    if (typeof anyWindow.acquireVsCodeApi === 'function') {
      globalVSCodeApi = anyWindow.acquireVsCodeApi();
      console.log('[VSCodeAPI] Global VS Code API acquired:', !!globalVSCodeApi);
      return globalVSCodeApi;
    }
    console.warn('[VSCodeAPI] acquireVsCodeApi function not available');
    return undefined;
  } catch (error) {
    console.error('[VSCodeAPI] Error acquiring VS Code API:', error);
    return undefined;
  }
}

// 发送消息到扩展端
export function postMessage(message: any): boolean {
  const api = getVSCodeApi();
  if (!api) {
    console.warn('[VSCodeAPI] VS Code API 不可用，无法发送消息:', message);
    return false;
  }
  
  api.postMessage(message);
  return true;
}

// 检查 VS Code API 是否可用
export function isVSCodeApiAvailable(): boolean {
  return !!getVSCodeApi();
}

// 初始化 VS Code API（在应用启动时调用）
export function initializeVSCodeApi(): void {
  getVSCodeApi();
}
