/// <reference path="../.pb_dev/types.d.ts" />
// Этап 4: синхронизация.
// - Вход живёт 90 дней (по умолчанию 7): телефон неделю без сети не должен выкидывать из аккаунта.
//   Каждая удачная синхронизация продлевает токен.
// - Первая выгрузка журнала — сотни событий подряд; стандартный лимит *:create (20 за 5 с) её душит.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users')
  users.authToken.duration = 90 * 24 * 3600
  app.save(users)

  const s = app.settings()
  const rules = s.rateLimits.rules.filter((r) => r.label !== 'events:create')
  rules.push({ label: 'events:create', audience: '@auth', duration: 10, maxRequests: 300 })
  s.rateLimits.rules = rules
  app.save(s)
})
