// Адрес сервера сохранений. Не секрет: публичная константа сборки из Repository Variables.
// Пусто — играем офлайн, синхронизации нет (этап 4).
export const API_URL: string = import.meta.env.VITE_API_URL ?? ''
