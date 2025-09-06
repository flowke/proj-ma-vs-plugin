import React, { useEffect, useState } from 'react';
import { Button, Space, Typography, Card, Radio, Divider } from 'antd';
import { FolderOpenOutlined, FileTextOutlined, ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import type { ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';

const { Title, Text } = Typography;

export default function Settings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      
      if (message?.type === 'configLoaded' && message.payload) {
        setConfig(message.payload);
      }
    };
    
    window.addEventListener('message', handler);
    
    // 加载配置
    try {
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Settings] failed to request config load', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleOpenConfigLocation = () => {
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    const success = postMessage({ type: 'openConfigLocation' });
    if (!success) {
      alert('发送消息失败，请检查VS Code扩展是否正常运行');
    }
  };

  const handleOpenConfigFile = () => {
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    const success = postMessage({ type: 'openConfigFile' });
    if (!success) {
      alert('发送消息失败，请检查VS Code扩展是否正常运行');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleEditorChange = (editor: 'vscode' | 'cursor') => {
    console.log('[Settings] handleEditorChange:', editor);
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }

    const updated = {
      ...config,
      settings: {
        ...config.settings,
        defaultEditor: editor,
      },
    };
    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });
  };

  const handleClearEditorSetting = () => {
    console.log('[Settings] handleClearEditorSetting');
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }

    const updated = {
      ...config,
      settings: {
        ...config.settings,
        defaultEditor: undefined,
      },
    };
    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });
  };

  return (
    <div style={{ padding: '16px', height: '100vh' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          style={{ 
            color: 'var(--vscode-foreground)',
            padding: '4px 8px',
          }}
        >
          返回
        </Button>
      </div>
      
      <Title 
        level={3} 
        style={{ 
          color: 'var(--vscode-foreground)', 
          marginBottom: '24px',
          fontSize: '18px',
        }}
      >
        设置
      </Title>

      <Card
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          borderColor: 'var(--vscode-panel-border)',
          borderRadius: '6px',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Title 
          level={4} 
          style={{ 
            color: 'var(--vscode-foreground)', 
            marginBottom: '16px',
            fontSize: '16px',
          }}
        >
          配置文件
        </Title>
        
        <Text 
          style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            display: 'block',
            marginBottom: '16px',
          }}
        >
          配置文件位置: ~/.proj-ma.json
        </Text>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleOpenConfigLocation}
            block
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-secondaryForeground)',
              textAlign: 'left',
              height: '36px',
            }}
          >
            打开配置文件所在位置
          </Button>

          <Button
            icon={<FileTextOutlined />}
            onClick={handleOpenConfigFile}
            block
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-secondaryForeground)',
              textAlign: 'left',
              height: '36px',
            }}
          >
            打开配置文件
          </Button>
        </Space>
      </Card>

      <Card
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          borderColor: 'var(--vscode-panel-border)',
          borderRadius: '6px',
          marginTop: '16px',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Title 
          level={4} 
          style={{ 
            color: 'var(--vscode-foreground)', 
            marginBottom: '16px',
            fontSize: '16px',
          }}
        >
          <EditOutlined style={{ marginRight: '8px' }} />
          编辑器设置
        </Title>
        
        <Text 
          style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            display: 'block',
            marginBottom: '16px',
          }}
        >
          选择点击编辑器图标时使用的默认编辑器
        </Text>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <style>{`
            .vscode-radio-group .ant-radio-wrapper {
              color: var(--vscode-foreground) !important;
              padding: 8px 12px !important;
              margin: 0 !important;
              width: 100% !important;
              border-radius: 4px !important;
              border: 1px solid transparent !important;
              transition: all 0.2s ease !important;
            }
            
            .vscode-radio-group .ant-radio-wrapper:hover {
              background-color: var(--vscode-list-hoverBackground) !important;
              border-color: var(--vscode-focusBorder) !important;
            }
            
            .vscode-radio-group .ant-radio-wrapper-checked {
              background-color: var(--vscode-list-activeSelectionBackground) !important;
              border-color: var(--vscode-focusBorder) !important;
              color: var(--vscode-list-activeSelectionForeground) !important;
            }
            
            .vscode-radio-group .ant-radio {
              border-color: var(--vscode-checkbox-border) !important;
            }
            
            .vscode-radio-group .ant-radio-checked .ant-radio-inner {
              border-color: var(--vscode-focusBorder) !important;
              background-color: var(--vscode-focusBorder) !important;
            }
            
            .vscode-radio-group .ant-radio-inner {
              background-color: var(--vscode-checkbox-background) !important;
              border-color: var(--vscode-checkbox-border) !important;
            }
            
            .vscode-radio-group .ant-radio:hover .ant-radio-inner {
              border-color: var(--vscode-focusBorder) !important;
            }
            
            .vscode-radio-group .ant-radio-checked .ant-radio-inner::after {
              background-color: var(--vscode-checkbox-foreground) !important;
            }
          `}</style>
          <Radio.Group 
            value={config.settings.defaultEditor} 
            onChange={(e) => handleEditorChange(e.target.value)}
            className="vscode-radio-group"
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%', gap: '4px' }}>
              <Radio 
                value="vscode"
              >
                VS Code
              </Radio>
              <Radio 
                value="cursor"
              >
                Cursor
              </Radio>
            </Space>
          </Radio.Group>

          {config.settings.defaultEditor && (
            <>
              <Divider style={{ margin: '12px 0', borderColor: 'var(--vscode-panel-border)' }} />
              <Button
                onClick={handleClearEditorSetting}
                style={{
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  borderColor: 'var(--vscode-button-border)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  height: '32px',
                }}
              >
                清除设置（下次点击时重新选择）
              </Button>
            </>
          )}

          {!config.settings.defaultEditor && (
            <Text 
              style={{ 
                color: 'var(--vscode-descriptionForeground)', 
                fontSize: '12px',
                fontStyle: 'italic',
              }}
            >
              当前未设置默认编辑器，点击编辑器图标时将弹出选择对话框
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
}
