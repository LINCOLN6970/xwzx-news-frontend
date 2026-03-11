<template>
  <div class="news-detail">
    <van-nav-bar
      title="新闻详情"
      left-text="返回"
      left-arrow
      @click-left="onClickLeft"
      fixed
    />

    <div class="detail-content" v-if="newsStore.newsDetail.id">
      <div class="title-container">
        <h1 class="title">{{ newsStore.newsDetail.title }}</h1>
        <van-button
          v-if="!isExternalNews"
          class="favorite-btn"
          :icon="isFavorite ? 'star' : 'star-o'"
          :class="{ 'is-favorite': isFavorite }"
          @click="toggleFavorite"
        />
      </div>

      <div class="info">
        <span class="source-badge">{{ sourceLabel }}</span>
        <span>{{ newsStore.newsDetail.author }}</span>
        <span>{{ newsStore.newsDetail.publishTime }}</span>
        <span>{{ newsStore.newsDetail.views }} 阅读</span>
      </div>

      <div class="source-link" v-if="newsStore.newsDetail.link">
        <van-button size="small" type="primary" plain @click="openOriginal">
          查看原文
        </van-button>
      </div>

      <div class="cover" v-if="newsStore.newsDetail.image">
        <img :src="newsStore.newsDetail.image" :alt="newsStore.newsDetail.title">
      </div>

      <div class="content">
        <p class="content-text">{{ detailContent }}</p>
      </div>

      <div class="related-news" v-if="newsStore.newsDetail.relatedNews?.length">
        <h3>相关推荐</h3>
        <div class="related-list">
          <div
            class="related-item"
            v-for="item in newsStore.newsDetail.relatedNews"
            :key="item.id"
            @click="goToRelatedNews(item.id)"
          >
            <div class="related-image">
              <img :src="item.image" :alt="item.title">
            </div>
            <div class="related-main">
              <div class="related-title">{{ item.title }}</div>
              <div class="related-desc">{{ relatedPreview(item) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <van-empty v-else description="加载中..." />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNewsStore } from '../store/modules/news'
import { useHistoryStore } from '../store/modules/history'
import { useFavoriteStore } from '../store/modules/favorite'
import { useUserStore } from '../store/user'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const newsStore = useNewsStore()
const historyStore = useHistoryStore()
const favoriteStore = useFavoriteStore()
const userStore = useUserStore()

const newsId = computed(() => String(route.params.id))
const isExternalNews = computed(
  () => route.query.source === 'external' || newsId.value.startsWith('external-')
)

const detailContent = computed(() => {
  const content = newsStore.newsDetail.content || ''
  const description = newsStore.newsDetail.description || ''
  return content || description
})

const sourceLabel = computed(() => {
  const id = String(newsStore.newsDetail?.id ?? '')
  const source = String(newsStore.newsDetail?.source ?? '')
  const isExternal = Boolean(newsStore.newsDetail?.isExternal ?? newsStore.newsDetail?.is_external)

  if (id.startsWith('external-')) return 'API实时'
  if (source.startsWith('crawler')) return '网页爬虫'
  if (source === 'external' || isExternal) return '外部API入库'
  return '本地数据库'
})

const relatedPreview = (item) => {
  const description = item?.description || ''
  const content = item?.content || ''
  return description || content.slice(0, 80)
}

const openOriginal = () => {
  const link = newsStore.newsDetail.link
  if (!link) return
  window.open(link, '_blank', 'noopener,noreferrer')
}

const onClickLeft = () => {
  router.back()
}

const goToRelatedNews = (id) => {
  router.push(`/news/detail/${id}`)
}

const isFavorite = computed(() => {
  if (isExternalNews.value) {
    return false
  }
  return favoriteStore.isFavorite(newsId.value)
})

const toggleFavorite = async () => {
  if (isExternalNews.value) {
    showToast({
      message: '外部新闻暂不支持收藏',
      position: 'bottom',
    })
    return
  }

  if (!userStore.getLoginStatus) {
    showToast({
      message: '请先登录后再收藏',
      position: 'bottom',
    })
    router.push('/login')
    return
  }

  const status = await favoriteStore.toggleFavorite(newsStore.newsDetail)

  if (status === true) {
    showToast({
      message: '已添加到收藏',
      position: 'bottom',
    })
  } else if (status === false) {
    showToast({
      message: '已取消收藏',
      position: 'bottom',
    })
  } else {
    showToast({
      message: '操作失败，请稍后重试',
      position: 'bottom',
    })
  }
}

onMounted(async () => {
  await newsStore.getNewsDetail(newsId.value, isExternalNews.value ? 'external' : 'db')

  if (newsStore.newsDetail.id) {
    if (isExternalNews.value) {
      historyStore.addHistory(newsStore.newsDetail)
    } else if (userStore.getLoginStatus) {
      try {
        const result = await historyStore.addHistoryApi(newsStore.newsDetail.id)
        console.log('记录浏览历史API结果:', result)
      } catch (error) {
        console.error('记录浏览历史API失败:', error)
      }
    }
  }

  favoriteStore.loadFavorites()

  if (!isExternalNews.value && userStore.getLoginStatus && newsStore.newsDetail.id) {
    const result = await favoriteStore.checkFavoriteStatusApi(newsStore.newsDetail.id)
    if (result.success && !result.isLocal) {
      if (result.isFavorite && !favoriteStore.isFavorite(newsStore.newsDetail.id)) {
        favoriteStore.addFavorite(newsStore.newsDetail)
      } else if (!result.isFavorite && favoriteStore.isFavorite(newsStore.newsDetail.id)) {
        favoriteStore.removeFavorite(newsStore.newsDetail.id)
      }
    }
  }
})
</script>

<style scoped>
.news-detail {
  padding-top: 46px;
  background-color: #fff;
  min-height: 100vh;
}

.detail-content {
  padding: 16px;
}

.title-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title {
  font-size: 22px;
  font-weight: bold;
  line-height: 1.4;
  margin: 0;
  flex: 1;
}

.favorite-btn {
  flex-shrink: 0;
  margin-left: 10px;
  padding: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.favorite-btn.is-favorite {
  color: #ff9500;
}

.info {
  display: flex;
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.info span {
  margin-right: 12px;
}

.source-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  color: #1989fa;
  background: #e8f3ff;
}

.source-link {
  margin-bottom: 16px;
}

.cover {
  margin-bottom: 16px;
}

.cover img {
  width: 100%;
  border-radius: 4px;
}

.content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
}

.content-text {
  margin-bottom: 16px;
  text-align: justify;
  white-space: pre-wrap;
  line-height: 1.8;
}

.related-news {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 8px solid #f5f5f5;
}

.related-news h3 {
  font-size: 18px;
  margin: 0 0 16px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.related-item {
  display: flex;
  align-items: center;
}

.related-image {
  width: 80px;
  height: 60px;
  margin-right: 12px;
  flex-shrink: 0;
}

.related-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.related-main {
  flex: 1;
  min-width: 0;
}

.related-title {
  font-size: 14px;
  line-height: 1.4;
}

.related-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #777;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
