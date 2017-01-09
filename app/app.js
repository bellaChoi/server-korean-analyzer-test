var express = require('express')
var bodyParser = require('body-parser')
var api = require('./api')
var app = express()

var routes = {
  '/v1/*': require('./v1/routes/api'),
  '/v1/noun': require('./v1/routes/noun')
}

if (app.get('env') === 'development') {
  var logger = require('morgan')
  var path = require('path')

  // add elapsed_time
  app.use(function (req, res, next) {
    res.elapsed_time = process.hrtime()
    next()
  })

  // 개발용을 위해 response에 따라 색상이 입혀진 축약된 로그를 출력함.
  // red - server error code
  // yellow - client error code
  // green - redirection code
  app.use(logger('dev'))
  app.use(express.static(path.join(__dirname, '../public')))
}

app.disable('x-powered-by')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}))

// enable cors
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Request-Method', 'GET,PUT,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', [
    'Content-Type',
    'X-MAD-CLIENT-ID',
    'X-MAD-CLIENT-SECRET'
  ].join(', '))

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
  } else {
    next()
  }
})

for (var k in routes) {
  app.use(k, routes[k])
}

// 예외 발생시 에러 알림.
process.on('uncaughtException', function (err) {
  console.log(err.stack)
  api.notifier.error(err)
})

// 404 error handler
app.use(function (req, res, next) {
  next({
    type: 'common.unsupported',
    code: 404,
    message: 'Unsupported API'
  })
})

// error handler handlers
app.use(function (err, req, res, next) {
  api.error(err, req, res)
})

module.exports = app
