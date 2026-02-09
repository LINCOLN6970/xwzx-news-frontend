/**
 * API配置文件
 * 包含API基础URL和AI问答功能所需的API参数
 */

// API基础URL配置
// 开发环境：使用相对路径，通过Vite代理转发到后端
// 生产环境：使用环境变量 VITE_API_BASE_URL（部署到Azure时配置）
export const apiConfig = {
  baseURL: import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'),
}

export const aiChatConfig = {
  // OpenAI API地址
  apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  
  // API Key (由开发人员指定)
  apiKey: 'sk-9c4d89982a6a4bd3b7494d94751fe81c',
  
  // 使用的模型
  model: 'qwen3-max-preview'
}
