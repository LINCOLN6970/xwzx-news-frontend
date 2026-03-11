<template>
  <div class="news-item" @click="goToDetail">
    <div class="news-content">
      <h3 class="news-title">
        <span class="origin-badge">{{ sourceLabel }}</span>
        {{ news.title }}
      </h3>
      <p class="news-desc">{{ previewText }}</p>
      <div class="news-info">
        <span>{{ news.author }}</span>
        <span>{{ news.publishTime }}</span>
        <span>{{ news.views }} 阅读</span>
      </div>
    </div>
    <div class="news-image">
      <img :src="news.image" :alt="news.title">
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  news: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const previewText = computed(() => {
  const description = props.news?.description || ''
  const content = props.news?.content || ''
  return description || content.slice(0, 180)
})

const sourceLabel = computed(() => {
  const id = String(props.news?.id ?? '')
  const source = String(props.news?.source ?? '')
  const isExternal = Boolean(props.news?.isExternal ?? props.news?.is_external)

  if (id.startsWith('external-')) return 'API实时'
  if (source.startsWith('crawler')) return '网页爬虫'
  if (source === 'external' || isExternal) return '外部API入库'
  return '本地数据库'
})

const goToDetail = () => {
  if (props.news?.source === 'external') {
    router.push({
      path: `/news/detail/${props.news.id}`,
      query: { source: 'external' }
    })
    return
  }

  router.push(`/news/detail/${props.news.id}`)
}
</script>

<style scoped>
.news-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f2f2f2;
  background-color: #fff;
}

.news-content {
  flex: 1;
  margin-right: 12px;
  overflow: hidden;
}

.news-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.origin-badge {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  line-height: 16px;
  color: #1989fa;
  background: #e8f3ff;
  vertical-align: text-top;
}

.news-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 8px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.news-info {
  font-size: 12px;
  color: #999;
  display: flex;
}

.news-info span {
  margin-right: 10px;
}

.news-image {
  width: 110px;
  height: 80px;
  flex-shrink: 0;
}

.news-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
</style>
