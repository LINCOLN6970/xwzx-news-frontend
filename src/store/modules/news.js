import { defineStore } from 'pinia'
import axios from 'axios'
import { apiConfig } from '../../config/api'

const EXTERNAL_CATEGORY_ID = -1
const MORE_CATEGORY_ID = 10
const EXTERNAL_CACHE_KEY = 'external-news-cache'
const ENABLE_EXTERNAL_TAB = false

function dedupeCategoriesByName(categories) {
  const deduped = []
  const seen = new Set()

  categories.forEach(item => {
    if (!seen.has(item.name)) {
      seen.add(item.name)
      deduped.push(item)
    }
  })

  return deduped
}

function insertExternalCategory(categories) {
  const dbExternalIndex = categories.findIndex(item => item.name === 'AI外部')
  const externalCategory =
    dbExternalIndex !== -1
      ? categories[dbExternalIndex]
      : { id: EXTERNAL_CATEGORY_ID, name: 'AI实时' }

  const categoriesWithoutExternal =
    dbExternalIndex !== -1
      ? categories.filter((_, index) => index !== dbExternalIndex)
      : [...categories]

  const headlineIndex = categoriesWithoutExternal.findIndex(item => item.name === '头条')
  if (headlineIndex !== -1) {
    return [
      ...categoriesWithoutExternal.slice(0, headlineIndex + 1),
      externalCategory,
      ...categoriesWithoutExternal.slice(headlineIndex + 1)
    ]
  }

  if (categoriesWithoutExternal.length === 0) {
    return [externalCategory]
  }

  return [categoriesWithoutExternal[0], externalCategory, ...categoriesWithoutExternal.slice(1)]
}

function removeExternalCategory(categories) {
  return categories.filter(item => item.id !== EXTERNAL_CATEGORY_ID && item.name !== 'AI外部' && item.name !== 'AI实时')
}

function resolveSourceLabel(item) {
  const id = String(item?.id ?? '')
  const source = String(item?.source ?? '')
  const isExternal = Boolean(item?.is_external ?? item?.isExternal)

  if (id.startsWith('external-')) return 'API实时'
  if (source.startsWith('crawler')) return '网页爬虫'
  if (source === 'external' || isExternal) return '外部API入库'
  return '本地数据库'
}

function normalizeNewsItem(item) {
  return {
    ...item,
    publishTime: item.publishTime ?? item.publish_time ?? '',
    categoryId: item.categoryId ?? item.category_id,
    image: item.image || '',
    author: item.author || 'External',
    views: item.views ?? 0,
    source: item.source ?? '',
    isExternal: item.isExternal ?? item.is_external ?? false,
    sourceLabel: resolveSourceLabel(item)
  }
}

function readExternalCache() {
  try {
    const raw = sessionStorage.getItem(EXTERNAL_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeExternalCache(cache) {
  try {
    sessionStorage.setItem(EXTERNAL_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore sessionStorage failures and keep the in-memory cache.
  }
}

export const useNewsStore = defineStore('news', {
  state: () => ({
    newsList: [],
    newsDetail: {},
    categories: [],
    externalNewsCache: readExternalCache(),
    currentCategory: 1,
    loading: false,
    refreshing: false,
    finished: false,
    categoriesLoading: false
  }),

  actions: {
    async getCategories() {
      if (this.categoriesLoading) return

      this.categoriesLoading = true

      try {
        const response = await axios.get(`${apiConfig.baseURL}/api/news/categories`)

        if (response.data && response.data.code === 200) {
          const baseCategories = ENABLE_EXTERNAL_TAB
            ? insertExternalCategory(response.data.data)
            : removeExternalCategory(response.data.data)
          const categoriesWithExternal = baseCategories
          const dedupedCategories = dedupeCategoriesByName(categoriesWithExternal)
          this.categories = [
            ...dedupedCategories,
            { id: MORE_CATEGORY_ID, name: '更多' }
          ]

          if (!this.currentCategory && this.categories.length > 0) {
            this.currentCategory = this.categories[0].id
          }
        }
      } catch (error) {
        console.error('获取新闻分类失败:', error)
        const fallbackSeedCategories = [
          { id: 1, name: 'CNN' },
          { id: 2, name: 'FOX' },
          { id: 3, name: '中国新闻网' }
        ]
        const fallbackCategories = ENABLE_EXTERNAL_TAB
          ? insertExternalCategory(fallbackSeedCategories)
          : removeExternalCategory(fallbackSeedCategories)
        const dedupedFallbackCategories = dedupeCategoriesByName(fallbackCategories)
        this.categories = [
          ...dedupedFallbackCategories,
          { id: MORE_CATEGORY_ID, name: '更多' }
        ]
      } finally {
        this.categoriesLoading = false
      }
    },

    changeCategory(categoryId) {
      if (this.currentCategory !== categoryId) {
        this.currentCategory = categoryId
        this.newsList = []
        this.finished = false
        this.getNewsList(true)
      }
    },

    async getExternalNewsList() {
      const response = await axios.get(`${apiConfig.baseURL}/api/news/external`)

      if (response.data && response.data.code === 200) {
        const rawList = response.data.data.list || []
        const externalNews = rawList.map(normalizeNewsItem)
        const cache = { ...this.externalNewsCache }

        externalNews.forEach(item => {
          cache[item.id] = item
        })

        this.externalNewsCache = cache
        writeExternalCache(this.externalNewsCache)

        return externalNews
      }

      return []
    },

    async getNewsList(isRefresh = false) {
      if (isRefresh) {
        this.refreshing = true
        this.newsList = []
        this.finished = false
      }

      this.loading = true

      try {
        let newsData = []

        if (ENABLE_EXTERNAL_TAB && this.currentCategory === EXTERNAL_CATEGORY_ID) {
          newsData = await this.getExternalNewsList()
          this.newsList = newsData
          this.finished = true
          return
        }

        const params = {
          categoryId: this.currentCategory,
          page: isRefresh ? 1 : Math.ceil(this.newsList.length / 10) + 1,
          pageSize: 10
        }

        const isHeadline = Number(this.currentCategory) === 1
        const response = isHeadline
          ? await axios.get(`${apiConfig.baseURL}/api/news/headline`, {
              params: {
                page: params.page,
                pageSize: params.pageSize
              }
            })
          : await axios.get(`${apiConfig.baseURL}/api/news/list`, { params })

        if (response.data && response.data.code === 200) {
          const rawList = response.data.data.list || []
          newsData = rawList.map(normalizeNewsItem)
          this.newsList = isRefresh ? newsData : [...this.newsList, ...newsData]

          if (newsData.length < params.pageSize) {
            this.finished = true
          }
        }
      } catch (error) {
        console.error('获取新闻列表失败:', error)
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },

    async getNewsDetail(id, source = 'db') {
      const isExternalNews = ENABLE_EXTERNAL_TAB && String(id).startsWith('external-')

      if (isExternalNews) {
        const existingNews = this.newsList.find(item => String(item.id) === String(id))
        if (existingNews) {
          this.newsDetail = {
            ...existingNews,
            relatedNews: []
          }
          return
        }

        const cachedNews = this.externalNewsCache[String(id)] || readExternalCache()[String(id)]
        if (cachedNews) {
          this.externalNewsCache = {
            ...this.externalNewsCache,
            [String(id)]: cachedNews
          }
          this.newsDetail = {
            ...cachedNews,
            relatedNews: []
          }
          return
        }

        const externalNews = await this.getExternalNewsList()
        const fetchedNews = externalNews.find(item => String(item.id) === String(id))
        if (fetchedNews) {
          this.newsDetail = {
            ...fetchedNews,
            relatedNews: []
          }
          return
        }

        this.newsDetail = {}
        return
      }

      try {
        const response = await axios.get(`${apiConfig.baseURL}/api/news/detail?id=${id}`)

        if (response.data && response.data.code === 200) {
          const detail = normalizeNewsItem(response.data.data || {})
          const relatedRaw = response.data.data?.relatedNews || []
          detail.relatedNews = relatedRaw.map(normalizeNewsItem)
          this.newsDetail = detail
        } else {
          console.error('获取新闻详情失败: 接口返回错误')
        }
      } catch (error) {
        console.error('获取新闻详情失败:', error)
      }
    },

    getCategoryName(categoryId) {
      const category = this.categories.find(item => item.id === categoryId)
      return category ? category.name : '未知'
    }
  }
})