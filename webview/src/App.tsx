import React from 'react';
import { ConfigProvider, message } from 'antd';

interface AppProps {
  children: React.ReactNode;
}

export default function App({ children }: AppProps) {
  // 配置全局 message 的 maxCount
  React.useEffect(() => {
    message.config({
      maxCount: 1,
    });
  }, []);

  return (
    <>
      {/* 全局样式覆盖，确保 VS Code 主题生效 */}
      <style>{`
        .ant-input {
          background-color: var(--vscode-input-background) !important;
          border-color: var(--vscode-input-border) !important;
          color: var(--vscode-input-foreground) !important;
        }
        
        .ant-input::placeholder {
          color: var(--vscode-descriptionForeground) !important;
          opacity: 0.8;
        }
        
        .ant-input:focus {
          border-color: var(--vscode-focusBorder) !important;
          box-shadow: none !important;
        }
        
        .ant-input:hover {
          border-color: var(--vscode-focusBorder) !important;
        }
        
        .ant-form-item-label > label {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-content {
          background-color: var(--vscode-editor-background) !important;
        }
        
        .ant-modal-header {
          background-color: var(--vscode-editor-background) !important;
        }
        
        .ant-modal-title {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-close {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-close:hover {
          background-color: var(--vscode-list-hoverBackground) !important;
          color: var(--vscode-foreground) !important;
        }
        
        .ant-modal-close-x {
          color: var(--vscode-foreground) !important;
        }
        
        .ant-btn-default {
          background-color: var(--vscode-button-secondaryBackground) !important;
          border-color: var(--vscode-button-border) !important;
          color: var(--vscode-button-secondaryForeground) !important;
        }
        
        .ant-btn-primary {
          background-color: var(--vscode-button-background) !important;
          border-color: var(--vscode-button-border) !important;
          color: var(--vscode-button-foreground) !important;
        }
        
        .ant-btn-default:hover,
        .ant-btn-primary:hover {
          opacity: 0.9;
        }
        
        /* 拖拽样式优化 - 保持原有尺寸，避免缩放 */
        .ant-collapse-item.sortable-chosen {
          transform: none !important;
        }
        
        .ant-collapse-item.sortable-drag {
          opacity: 0.8 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          transform: rotate(2deg) !important;
          z-index: 1000 !important;
        }
        
        .ant-collapse-item.sortable-ghost {
          opacity: 0.3 !important;
        }
        
        /* 拖拽时保持 Collapse 的原始样式 */
        [data-sortable-id] .ant-collapse {
          transition: none !important;
        }
        
        [data-sortable-id] .ant-collapse-item {
          transition: none !important;
        }
        
        /* 拖拽时的光标样式 */
        .ant-collapse-header[title*="拖拽"] {
          cursor: grab !important;
        }
        
        .ant-collapse-header[title*="拖拽"]:active {
          cursor: grabbing !important;
        }
        
        /* 未分类标签的光标样式 - 悬停时为 pointer */
        .ant-collapse-header:not([title]) {
          cursor: pointer !important;
        }
        
        .ant-collapse-header:not([title]):hover {
          cursor: pointer !important;
        }
        
        .default-category-header {
          cursor: pointer !important;
        }
        
        .default-category-header:hover {
          cursor: pointer !important;
        }
        
        /* 防止 Collapse 初始化时的动画闪烁 */
        .ant-collapse-ghost > .ant-collapse-item:not(.ant-collapse-item-active) > .ant-collapse-content {
          display: none;
        }
        
        .ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box {
          padding: 0;
        }
        
        /* 确保 Collapse 状态切换的平滑过渡 */
        .ant-collapse-content {
          transition: height 0.2s ease-in-out !important;
        }
        
        /* 全局 Collapse 样式统一 */
        .ant-collapse {
          background: transparent !important;
          border: none !important;
        }
        
        .ant-collapse-header {
          color: var(--vscode-foreground) !important;
          padding: 8px 0 !important;
        }
        
        .ant-collapse-content {
          background: transparent !important;
          border: none !important;
        }
        
        .ant-collapse-content-box {
          padding: 0 0 8px 0 !important;
        }
        
        .ant-collapse-item {
          border: none !important;
          margin-bottom: 8px !important;
        }
        
        .ant-collapse-item:last-child {
          border: none !important;
        }
        
        /* Dropdown 样式优化 */
        .ant-dropdown {
          background-color: var(--vscode-dropdown-background) !important;
          border: 1px solid var(--vscode-dropdown-border) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        
        .ant-dropdown .ant-dropdown-menu {
          background-color: var(--vscode-dropdown-background) !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        .ant-dropdown .ant-dropdown-menu-item {
          color: var(--vscode-dropdown-foreground) !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
        }
        
        .ant-dropdown .ant-dropdown-menu-item:hover {
          background-color: var(--vscode-list-hoverBackground) !important;
          color: var(--vscode-dropdown-foreground) !important;
        }
        
        .ant-dropdown .ant-dropdown-menu-item-danger {
          color: var(--vscode-errorForeground) !important;
        }
        
        .ant-dropdown .ant-dropdown-menu-item-danger:hover {
          background-color: var(--vscode-list-errorHoverBackground) !important;
          color: var(--vscode-errorForeground) !important;
        }
        
        .ant-dropdown .ant-dropdown-menu-item-divider {
          background-color: var(--vscode-menu-separatorBackground) !important;
          border-color: var(--vscode-menu-separatorBackground) !important;
          margin: 4px 0 !important;
          height: 1px !important;
        }
        
        /* Select 下拉选择框样式 */
        .ant-select-dropdown {
          background-color: var(--vscode-dropdown-background) !important;
          border: 1px solid var(--vscode-dropdown-border) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        
        .ant-select-item {
          color: var(--vscode-dropdown-foreground) !important;
          font-size: 13px !important;
        }
        
        .ant-select-item:hover {
          background-color: var(--vscode-list-hoverBackground) !important;
        }
        
        .ant-select-item-option-selected {
          background-color: var(--vscode-list-activeSelectionBackground) !important;
          color: var(--vscode-list-activeSelectionForeground) !important;
        }
        
        .ant-select-item-option-active {
          background-color: var(--vscode-list-hoverBackground) !important;
        }
        
        /* Divider 分割线样式 */
        .ant-divider-horizontal {
          border-top-color: var(--vscode-menu-separatorBackground) !important;
          margin: 8px 0 !important;
        }
        
        /* Modal 紧凑样式 */
        .ant-modal .ant-modal-content {
          padding: 0 !important;
        }
        
        .ant-modal .ant-modal-header {
          padding: 8px 12px !important;
          margin: 0 !important;
          border-bottom: 1px solid var(--vscode-panel-border) !important;
        }
        
        .ant-modal .ant-modal-body {
          padding: 12px !important;
        }
        
        .ant-modal .ant-modal-title {
          font-size: 13px !important;
          font-weight: 500 !important;
        }
        
        .ant-modal .ant-modal-close {
          top: 6px !important;
          right: 8px !important;
          width: 20px !important;
          height: 20px !important;
        }
      `}</style>
      <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'var(--vscode-button-background)',
          colorBgContainer: 'var(--vscode-sideBar-background)',
          colorText: 'var(--vscode-foreground)',
          colorBorder: 'transparent',
          colorSplit: 'transparent',
        },
        components: {
          Layout: {
            colorBgContainer: 'var(--vscode-sideBar-background)',
          },
          Collapse: {
            headerBg: 'transparent',
            contentBg: 'transparent',
            borderRadiusLG: 0,
            headerPadding: '8px 0',
            contentPadding: '0 0 8px 0',
            colorBorder: 'transparent',
            colorText: 'var(--vscode-foreground)',
            colorTextHeading: 'var(--vscode-foreground)',
            fontSize: 13,
            fontSizeIcon: 12,
          },
          List: {
            itemPadding: '2px 0',
          },
          Input: {
            colorBgContainer: 'var(--vscode-input-background)',
            colorBorder: 'var(--vscode-input-border)',
            colorText: 'var(--vscode-input-foreground)',
            colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
            activeBorderColor: 'var(--vscode-focusBorder)',
            hoverBorderColor: 'var(--vscode-input-border)',
            activeShadow: 'none',
            boxShadow: 'none',
          },
          Form: {
            labelColor: 'var(--vscode-foreground)',
            labelRequiredMarkColor: 'var(--vscode-errorForeground)',
          },
          Modal: {
            contentBg: 'var(--vscode-editor-background)',
            headerBg: 'var(--vscode-editor-background)',
            titleColor: 'var(--vscode-foreground)',
            colorIcon: 'var(--vscode-foreground)',
            colorIconHover: 'var(--vscode-foreground)',
          },
          Button: {
            colorText: 'var(--vscode-button-foreground)',
            colorBgContainer: 'var(--vscode-button-background)',
            colorBorder: 'var(--vscode-button-border)',
            colorPrimary: 'var(--vscode-button-background)',
            colorPrimaryText: 'var(--vscode-button-foreground)',
            colorTextDisabled: 'var(--vscode-disabledForeground)',
          },
          Dropdown: {
            colorBgElevated: 'var(--vscode-dropdown-background)',
            colorBorder: 'var(--vscode-dropdown-border)',
            colorText: 'var(--vscode-dropdown-foreground)',
            controlItemBgHover: 'var(--vscode-list-hoverBackground)',
            controlItemBgActive: 'var(--vscode-list-activeSelectionBackground)',
            colorTextDescription: 'var(--vscode-descriptionForeground)',
          },
          Select: {
            colorBgContainer: 'var(--vscode-input-background)',
            colorBorder: 'var(--vscode-input-border)',
            colorText: 'var(--vscode-input-foreground)',
            colorTextPlaceholder: 'var(--vscode-input-placeholderForeground)',
            colorBgElevated: 'var(--vscode-dropdown-background)',
            optionSelectedBg: 'var(--vscode-list-activeSelectionBackground)',
            optionSelectedColor: 'var(--vscode-list-activeSelectionForeground)',
            optionActiveBg: 'var(--vscode-list-hoverBackground)',
            colorPrimary: 'var(--vscode-focusBorder)',
          },
          Divider: {
            colorSplit: 'var(--vscode-menu-separatorBackground)',
          },
        },
      }}
      >
        {children}
      </ConfigProvider>
    </>
  );
}
