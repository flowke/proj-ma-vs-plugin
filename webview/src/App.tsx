import React from 'react';
import { ConfigProvider, message } from 'antd';
import { antdTheme, dragStyles } from './theme/antd-theme';
import { vscodeColors, opacity, shadow, spacing, fontSize, fontWeight, size } from './theme/tokens';

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
          background-color: ${vscodeColors.inputBackground} !important;
          border-color: ${vscodeColors.inputBorder} !important;
          color: ${vscodeColors.inputForeground} !important;
        }
        
        .ant-input::placeholder {
          color: ${vscodeColors.descriptionForeground} !important;
          opacity: ${opacity.placeholder};
        }
        
        .ant-input:focus {
          border-color: ${vscodeColors.focusBorder} !important;
          box-shadow: none !important;
        }
        
        .ant-input:hover {
          border-color: ${vscodeColors.focusBorder} !important;
        }
        
        .ant-form-item-label > label {
          color: ${vscodeColors.foreground} !important;
        }
        
        .ant-modal-content {
          background-color: ${vscodeColors.editorBackground} !important;
        }
        
        .ant-modal-header {
          background-color: ${vscodeColors.editorBackground} !important;
        }
        
        .ant-modal-title {
          color: ${vscodeColors.foreground} !important;
        }
        
        .ant-modal-close {
          color: ${vscodeColors.foreground} !important;
        }
        
        .ant-modal-close:hover {
          background-color: ${vscodeColors.hoverBackground} !important;
          color: ${vscodeColors.foreground} !important;
        }
        
        .ant-modal-close-x {
          color: ${vscodeColors.foreground} !important;
        }
        
        .ant-btn-default {
          background-color: ${vscodeColors.buttonSecondaryBackground} !important;
          border-color: ${vscodeColors.buttonBorder} !important;
          color: ${vscodeColors.buttonSecondaryForeground} !important;
        }
        
        .ant-btn-primary {
          background-color: ${vscodeColors.buttonBackground} !important;
          border-color: ${vscodeColors.buttonBorder} !important;
          color: ${vscodeColors.buttonForeground} !important;
        }
        
        .ant-btn-default:hover,
        .ant-btn-primary:hover {
          opacity: ${opacity.hover};
        }
        
        /* 拖拽样式优化 - 保持原有尺寸，避免缩放 */
        .ant-collapse-item.sortable-chosen {
          transform: ${dragStyles.chosen.transform} !important;
        }
        
        .ant-collapse-item.sortable-drag {
          opacity: ${dragStyles.drag.opacity} !important;
          box-shadow: ${dragStyles.drag.boxShadow} !important;
          transform: ${dragStyles.drag.transform} !important;
          z-index: ${dragStyles.drag.zIndex} !important;
        }
        
        .ant-collapse-item.sortable-ghost {
          opacity: ${dragStyles.ghost.opacity} !important;
        }
        
        /* 拖拽时保持 Collapse 的原始样式 */
        [data-sortable-id] .ant-collapse {
          transition: ${dragStyles.transition.none} !important;
        }
        
        [data-sortable-id] .ant-collapse-item {
          transition: ${dragStyles.transition.none} !important;
        }
        
        /* 拖拽时的光标样式 */
        .ant-collapse-header[title*="拖拽"] {
          cursor: ${dragStyles.cursor.grab} !important;
        }
        
        .ant-collapse-header[title*="拖拽"]:active {
          cursor: ${dragStyles.cursor.grabbing} !important;
        }
        
        /* 未分类标签的光标样式 - 悬停时为 pointer */
        .ant-collapse-header:not([title]) {
          cursor: ${dragStyles.cursor.pointer} !important;
        }
        
        .ant-collapse-header:not([title]):hover {
          cursor: ${dragStyles.cursor.pointer} !important;
        }
        
        .default-category-header {
          cursor: ${dragStyles.cursor.pointer} !important;
        }
        
        .default-category-header:hover {
          cursor: ${dragStyles.cursor.pointer} !important;
        }
        
        /* 防止 Collapse 初始化时的动画闪烁 */
        .ant-collapse-ghost > .ant-collapse-item:not(.ant-collapse-item-active) > .ant-collapse-content {
          display: none;
        }
        
        
        /* 确保 Collapse 状态切换的平滑过渡 */
        .ant-collapse-content {
          transition: ${dragStyles.transition.height} !important;
        }
        
        /* 全局 Collapse 样式统一 */
        .ant-collapse {
          background: transparent !important;
          border: none !important;
        }
        
        .ant-collapse-header {
          color: ${vscodeColors.foreground} !important;
        }
        
        .ant-collapse-content {
          background: transparent !important;
          border: none !important;
        }
        
        .ant-collapse-content-box {
        }
        
        .ant-collapse-item {
          border: none !important;
          margin-bottom: ${spacing.sm}px !important;
        }
        
        .ant-collapse-item:last-child {
          border: none !important;
        }
        

        /* Select 下拉选择框样式 */
        .ant-select-dropdown {
          background-color: ${vscodeColors.dropdownBackground} !important;
          border: 1px solid ${vscodeColors.dropdownBorder} !important;
          box-shadow: ${shadow.dropdown} !important;
        }
        
        .ant-select-item {
          color: ${vscodeColors.dropdownForeground} !important;
          font-size: ${fontSize.md}px !important;
        }
        
        .ant-select-item:hover {
          background-color: ${vscodeColors.hoverBackground} !important;
        }
        
        .ant-select-item-option-selected {
          background-color: ${vscodeColors.activeBackground} !important;
          color: ${vscodeColors.activeForeground} !important;
        }
        
        .ant-select-item-option-active {
          background-color: ${vscodeColors.hoverBackground} !important;
        }
        
        
        /* Modal 紧凑样式 */
        .ant-modal .ant-modal-content {
          padding: 0 !important;
        }
        
        .ant-modal .ant-modal-header {
          padding: ${dragStyles.spacing.padding.modal.header} !important;
          margin: 0 !important;
          border-bottom: 1px solid ${vscodeColors.panelBorder} !important;
        }
        
        .ant-modal .ant-modal-body {
          padding: ${dragStyles.spacing.padding.modal.body} !important;
        }
        
        .ant-modal .ant-modal-title {
          font-size: ${fontSize.md}px !important;
          font-weight: ${fontWeight.medium} !important;
        }
        
        .ant-modal .ant-modal-close {
          top: ${dragStyles.spacing.padding.modal.close.top} !important;
          right: ${dragStyles.spacing.padding.modal.close.right} !important;
          width: ${dragStyles.spacing.padding.modal.close.width} !important;
          height: ${dragStyles.spacing.padding.modal.close.height} !important;
        }
      `}</style>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </>
  );
}
