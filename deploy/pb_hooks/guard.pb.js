/// <reference path="../.pb_dev/types.d.ts" />
// Наружу через Tailscale Funnel открыт только /api. Но вход суперпользователя и служебные
// эндпоинты тоже живут под /api — закрываем их для любых запросов, пришедших через прокси.
// Локально (http://127.0.0.1:8090/_/) админка работает как обычно: там нет заголовков прокси.
routerUse((e) => {
  const h = e.request.header
  const proxied =
    h.get('X-Forwarded-For') !== '' ||
    h.get('X-Forwarded-Host') !== '' ||
    h.get('Tailscale-Funnel-Request') !== '' ||
    h.get('Forwarded') !== ''

  if (proxied) {
    const p = e.request.url.path
    const admin =
      p.startsWith('/api/collections/_superusers') ||
      p.startsWith('/api/settings') ||
      p.startsWith('/api/backups') ||
      p.startsWith('/api/logs') ||
      p.startsWith('/api/crons') ||
      /^\/api\/collections(\/[^/]+)?(\/(truncate|import))?\/?$/.test(p) ||
      /\/impersonate\//.test(p)
    if (admin) {
      throw new ForbiddenError('Недоступно снаружи.')
    }
  }
  return e.next()
})
