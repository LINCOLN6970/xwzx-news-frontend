import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import axios from 'axios'
import { apiConfig } from './config/api'
import { useUserStore } from './store/user'

// 配置axios全局默认值
axios.defaults.baseURL = apiConfig.baseURL
axios.defaults.timeout = 10000
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 导入Vant组件库
import { 
  Button, 
  NavBar, 
  Tabbar, 
  TabbarItem, 
  Tab, 
  Tabs, 
  List, 
  PullRefresh, 
  Cell, 
  CellGroup,
  Grid,
  GridItem,
  Empty,
  Form,
  Field,
  Image,
  Toast,
  Icon,
  Popup
} from 'vant'

// 导入Vant样式
import 'vant/lib/index.css'

// 导入全局样式
import './style.css'

// 引入国际化
import { setupI18n } from './i18n'

const app = createApp(App)

// 设置i18n
const i18n = setupI18n()
app.use(i18n)

// 注册Vant组件
app.use(Button)
app.use(NavBar)
app.use(Tabbar)
app.use(TabbarItem)
app.use(Tab)
app.use(Tabs)
app.use(List)
app.use(PullRefresh)
app.use(Cell)
app.use(CellGroup)
app.use(Grid)
app.use(GridItem)
app.use(Empty)
app.use(Form)
app.use(Field)
app.use(Image)
app.use(Toast)
app.use(Icon)
app.use(Popup)

// 使用路由和状态管理
app.use(router)
app.use(pinia)

// 在pinia初始化后配置axios拦截器
// 配置axios请求拦截器 - 自动添加token
axios.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = userStore.token
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 配置axios响应拦截器 - 统一处理错误
axios.interceptors.response.use(
  response => {
    return response
  },
  error => {
    if (error.response) {
      const { status } = error.response
      if (status === 401) {
        // 未授权，清除token
        const userStore = useUserStore()
        userStore.token = ''
        userStore.isLogin = false
        userStore.userInfo = null
        // 可以在这里添加路由跳转到登录页
        // router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

app.mount('#app')

// 初始化主题
import { useThemeStore } from './store/theme'
const themeStore = useThemeStore()
themeStore.initTheme()
