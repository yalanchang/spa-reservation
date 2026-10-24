import { ref } from 'vue'

const KEY = 'favoriteServices'

const load = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

const favorites = ref<number[]>(load())

// 收藏只存在這台瀏覽器
const save = (list: number[]) => {
  favorites.value = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // 無痕模式等情況存不了，就只在這次瀏覽有效
  }
}

export const useFavorites = () => {
  const isFavorite = (id: number) => favorites.value.includes(id)

  const toggleFavorite = (id: number) => {
    save(isFavorite(id) ? favorites.value.filter((f) => f !== id) : [...favorites.value, id])
    return isFavorite(id)
  }

  // 一次移除多筆，回傳移除前的清單，方便復原
  const removeFavorites = (ids: number[]) => {
    const previous = [...favorites.value]
    save(favorites.value.filter((f) => !ids.includes(f)))
    return previous
  }

  return { favorites, isFavorite, toggleFavorite, removeFavorites, setFavorites: save }
}
