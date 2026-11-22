/// <reference path="../.pb_dev/types.d.ts" />
// Схема сохранений: журнал событий + снимок состояния. См. docs/GAME_SPEC.md → «Сохранение».
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    // Регистрация закрыта: игрок создаётся вручную в админке.
    users.createRule = null
    app.save(users)

    const own = 'user = @request.auth.id'

    const events = new Collection({
      type: 'base',
      name: 'events',
      listRule: own,
      viewRule: own,
      createRule: "@request.auth.id != '' && " + own,
      updateRule: null, // журнал неизменяемый
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'eid', type: 'text', required: true, min: 8, max: 64, pattern: '^[A-Za-z0-9_-]+$' },
        { name: 'ts', type: 'number', required: true, onlyInt: true },
        { name: 'dev', type: 'text', max: 64 },
        { name: 'type', type: 'text', required: true, max: 64 },
        { name: 'data', type: 'json', maxSize: 65536 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_events_user_eid ON events (user, eid)',
        'CREATE INDEX idx_events_user_created ON events (user, created)',
      ],
    })
    app.save(events)

    const snapshots = new Collection({
      type: 'base',
      name: 'snapshots',
      listRule: own,
      viewRule: own,
      createRule: "@request.auth.id != '' && " + own,
      updateRule: own + ' && @request.body.user:isset = false',
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        // id последнего события, вошедшего в снимок
        { name: 'upto', type: 'text', max: 64 },
        { name: 't', type: 'number', required: true, onlyInt: true },
        { name: 'data', type: 'json', required: true, maxSize: 2000000 },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_snapshots_user ON snapshots (user)'],
    })
    app.save(snapshots)
  },
  (app) => {
    for (const name of ['snapshots', 'events']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)
  },
)
