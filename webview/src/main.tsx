import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import App from './App';
import { router } from './router';
import { initializeVSCodeApi } from './vscode-api';
import 'antd/dist/reset.css';

// 初始化 VS Code API
initializeVSCodeApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App>
      <RouterProvider router={router} />
    </App>
  </React.StrictMode>
);

