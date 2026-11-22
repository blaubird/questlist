/// <reference path="../.pb_dev/types.d.ts" />
// Встроенные бэкапы каждые 6 часов (храним 8 = двое суток) и лимиты частоты запросов.
// Копии в облако делает deploy/backup.ps1.
migrate((app) => {
  const s = app.settings()
  s.backups.cron = '0 */6 * * *'
  s.backups.cronMaxKeep = 8
  // За Tailscale Funnel реальный IP клиента — в X-Forwarded-For (нужно лимитеру).
  s.trustedProxy.headers = ['X-Forwarded-For']
  s.trustedProxy.useLeftmostIP = true
  s.rateLimits.enabled = true
  app.save(s)
})
