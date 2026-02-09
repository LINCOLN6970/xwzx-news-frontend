/**
 * Axios请求封装
 * 统一处理请求拦截、响应拦截和错误处理
 */
import axios from 'axios'
import { apiConfig } from '../config/api'
import { useUserStore } from '../store/user'
import { showToast } from 'vant'

// 创建axios实例
const request = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 从store获取token
    const userStore = useUserStore()
    if (userStore.token) {
      // 添加token到请求头
      config.headers.Authorization = userStore.token
    }
    return config
  },
  error => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    // 直接返回响应数据
    return response
  },
  error => {
    console.error('响应拦截器错误:', error)
    
    // 处理错误响应
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          const userStore = useUserStore()
          userStore.logout()
          showToast('登录已过期，请重新登录')
          // 可以在这里添加路由跳转到登录页
          break
        case 403:
          showToast('没有权限访问')
          break
        case 404:
          showToast('请求的资源不存在')
          break
        case 500:
          showToast('服务器错误，请稍后再试')
          break
        default:
          showToast(data?.message || '请求失败，请稍后再试')
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      showToast('网络错误，请检查网络连接')
    } else {
      // 其他错误
      showToast('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

export default request
