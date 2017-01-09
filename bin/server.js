var init = require('./init')
var api = require('../app/api')
var config = api.config('config.json')

/**
 * start server
 */
var start = function (instanceId) {
  var http = require('http')
  var app = require('../app/app')

  var port = process.env.PORT || config.env.port

  // init env
  process.env.TZ = config.env.tz
  app.set('port', port)

  api.init(instanceId)

  http.createServer(app).listen(port, function () {
    api.notifier.info('start server. (port: ' + port + ')')
  })
}

init.async(function * () {
  try {
    var instanceId = yield init.instanceId.bind(null)
    config.env.instanceId = instanceId
    config.notifier.prefix = 'server'

    api.notifier = yield init.notifier.bind(null, config)
    start(process.env.PORT || config.env.port || '3004', 'UTC')
  } catch (err) {
    api.notifier.error(err.stack)
  }
})
