import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 构建配置
  build: {
    // 构建目标为 Node.js 环境
    target: 'node18',
    
    // 输出目录
    outDir: 'out',
    
    // 清空输出目录
    emptyOutDir: true,
    
    // 生成 source maps
    sourcemap: true,
    
    // 不压缩代码 (VS Code 扩展通常不需要压缩)
    minify: false,
    
    // Rollup 配置
    rollupOptions: {
      // 入口文件
      input: {
        extension: resolve(__dirname, 'src/extension.ts'),
        config: resolve(__dirname, 'src/config.ts'),
        webviewHtml: resolve(__dirname, 'src/webviewHtml.ts')
      },
      
      // 输出配置
      output: {
        // 使用 CommonJS 格式 (VS Code 扩展需要)
        format: 'cjs',
        
        // 输出文件名
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        
        // 保持外部依赖为外部引用
        inlineDynamicImports: false,
      },
      
      // 外部依赖 - 不打包这些依赖
      external: [
        'vscode', // VS Code API
        'path',
        'fs', 
        'os',
        'child_process',
        'util',
        'crypto',
        'http',
        'https',
        'url',
        'querystring',
        'stream',
        'buffer',
        'events',
        'assert',
        'net',
        'tls'
      ],
    },
    
    // 库模式配置
    lib: {
      entry: {
        extension: resolve(__dirname, 'src/extension.ts'),
        config: resolve(__dirname, 'src/config.ts'), 
        webviewHtml: resolve(__dirname, 'src/webviewHtml.ts')
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.js`
    }
  },
  
  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // 定义环境变量
  define: {
    // 确保是 Node.js 环境
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  
  // 优化依赖
  optimizeDeps: {
    // VS Code 扩展不需要依赖优化
    disabled: true
  }
});
