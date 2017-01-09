/**
 * @file api.js
 */

var message = require('simple-message')
var moment = require('moment')
var path = require('path')
var _ = require('lodash')
var defaults = require('merge-defaults')
var request = require('request')
var qs = require('querystring')
// var shortid = require('shortid')
// var randomstring = require('randomstring')

var config = require(path.join(__dirname, '/../conf/config.json'))

/**
 * @namespace api
 */
var api = {
  notifier: null,
  token: {
    access_token: null
  }
}

api.request = function (opt, cb) {
  if (typeof cb === 'undefined') {
    cb = function (err, res) {
      if (err) {
        return console.log('error', err)
      }

      console.log('response', res)
    }
  }

  if (opt.auth && api.token.access_token === null) {
    return api.auth(opt.auth, function (err, result) {
      if (err) {
        return cb(err)
      }

      api.request(opt, cb)
    })
  }
  var headers = {
    'Content-Type': 'application/json',
    'X-SNACKK-TZ-OFFSET': -540 // Asia/Seoul
  }

  if (api.token.access_token) {
    headers['Authorization'] = 'Bearer ' + api.token.access_token
  } else {
    headers['X-SNACKK-CLIENT-ID'] = config.api.clientId
    headers['X-SNACKK-CLIENT-SECRET'] = config.api.clientSecret
  }
  opt = defaults(opt || {}, {
    method: 'GET',
    headers: headers,
    data: {}
  })

  var url = opt.url
  if (typeof opt.param === 'object') {
    _.each(opt.param, function (val, key) {
      url = url.replace(':' + key, val)
    })
  }

  var param = {
    url: config.api.baseUrl + url,
    method: opt.method,
    headers: opt.headers,
    strctSSL: false
  }

  if (param.method === 'GET') {
    var data = _.reduce(opt.data, function (data, val, key) {
      data[key] = typeof val === 'object' ? JSON.stringify(val) : val
      return data
    }, {})
    param.url = [param.url, qs.stringify(data)].join('?')
  } else {
    param.body = opt.data
    param.json = true
  }

  // debug
  console.log('api.request ', param.method, param.url)

  return request(param, function (err, res, body) {
    if (err) {
      return cb(err)
    }

    var result = typeof body === 'string' ? JSON.parse(body) : body
    if (res.statusCode === 200) {
      cb(null, result)
    } else {
      cb(result.error)
    }
  })
}

api.auth = function (auth, cb) {
  this.request({
    url: '/auth/authorize/tosq',
    method: 'POST',
    data: auth
  }, function (err, result) {
    if (err) {
      return cb(err)
    }

    api.token.access_token = result.token.access_token

    return cb(null, result)
  })
}

api.logout = function () {
  api.token.access_token = null
}

api.config = function (url) {
  return config
}

api.init = function (instanceId) {
  var conf = config.notifier.logger
  var target = 'Logger'

  if (config.env.mode === 'production') {
    conf = config.notifier.slack
    target = 'Slack'
  }

  conf.prefix = conf.prefix + ' - server (' + instanceId + ')'

  api.notifier = require('log-notifier')[target](conf)
}

api.send = function (req, res, result, success, redirect) {
  // add nonce & elapsed_time
  if (res.elapsed_time) {
    var diff = process.hrtime(res.elapsed_time)
    result.elapsed_time = diff[0] / 1000 + diff[1] / 1000000
  }
  result.success = !!success
  result.nonce = req.body.nonce || req.query.nonce

  if (req.method === 'GET') {
    res.header('Cache-Control', 'private, must-revalidate, max-age=0, no-cache, no-store')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')

    if (res.locals.utime) {
      // Mon, 20 Apr 2015 10:49:57 GMT
      res.header('Last-Modified', moment(res.locals.utime).utc().format('ddd, DD MMM YYYY HH:mm:ss') + ' GMT')
    }
  }

  if (redirect) {
    res.writeHead(302, {
      Location: redirect.replace(/%s/, encodeURIComponent(JSON.stringify(result)))
    })
    return res.end()
  }

  return res.json(result)
}

api.error = function (err, req, res, origin) {
  var error = message.error.get(err)

  if (origin) {
    api.notifier.error(origin)
  }

  var redirect = req.body.redirect || req.query.redirect

  res.status(error.code || err.status || 500)
  api.send(req, res, {
    error: error
  }, false, redirect)

  // log
  if (origin || res.statusCode === 500) {
    if (origin && origin.stack) {
      console.error(origin.stack)
    }
    console.error(new Date(), origin || err, {
      route: req.route,
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params
    })
  }
}

api.validator = {
  param: function (req, res, next) {
    try {
      req.query.filter = typeof req.query.filter === 'string' ? JSON.parse(req.query.filter) : {}
      req.query.fields = typeof req.query.fields === 'string' ? JSON.parse(req.query.fields) : {}
      // req.query.target = typeof req.query.target === 'string' ? JSON.parse(req.query.target) : {}

      var target = ['fields', 'filter', 'option']
      _.each(target, function (key) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = JSON.parse(req.body[key])
        }
      })

      // 1, true 등으로 설정되지 않으면 비활성화 시킴.
      var filter = [
        req.query.fields, req.body.fields
      ]
      _.each(filter, function (target) {
        _.each(target, function (val, key) {
          if (!val) {
            delete target[key]
          }
        })
      })

      req.query.page = parseInt(req.query.page || 1, 10)
      req.query.page = req.query.page < 0 ? 0 : req.query.page

      req.query.limit = parseInt(req.query.limit || 10, 10) || 10
      req.query.limit = req.query.limit < 0 ? 10 : req.query.limit
      req.query.limit = req.query.limit > 200 ? 200 : req.query.limit

      req.query.count = parseInt(req.query.count || 10, 10) || 10
      req.query.count = req.query.count < 0 ? 10 : req.query.count

      req.query.sort = typeof req.query.sort === 'string' ? JSON.parse(req.query.sort) : []
    } catch (e) {
      return api.error('common.unexpected_parameter', req, res, e)
    }

    next()
  },
  mandatory: function (params, target) {
    target = target || 'query'
    if (typeof params === 'string') {
      params = [params]
    }

    var check = function (fields, param) {
      for (var i = 0; i < fields.length; i++) {
        if (typeof param[fields[i]] === 'undefined') {
          return false
        }
      }

      return true
    }

    return function (req, res, next) {
      if (_.isArray(params) === true) {
        if (check(params, req[target]) === false) {
          return api.error('common.missing_required_parameter', req, res)
        }

        next()
      } else if (_.isPlainObject(params) === true) {
        for (var key in params) {
          if (params.hasOwnProperty(key) === false) {
            continue
          }
          // form-urlencoded로 전달되는 경우 대비.
          if (typeof req[target][key] === 'string') {
            req[target][key] = JSON.parse(req[target][key])
          }
          if (typeof req[target][key] === 'undefined' || check(params[key], req[target][key]) === false) {
            return api.error('common.missing_required_parameter', req, res)
          }
        }

        next()
      }
    }
  }
}

// http://blog.vullum.io/nodejs-javascript-flow-fibers-generators/
api.async = function (fn) {
  var gen = fn()

  function next (err, res) {
    if (err) {
      return gen.throw(err)
    }
    var ret = gen.next(res)
    if (ret.done) {
      return
    }
    ret.value(next)
  }

  next()
}

// api.generateId = function (length) {
//   length = length || 10
//   var id = shortid.generate()
//   if (/[-_]/.test(id)) {
//     id = randomstring.generate(length)
//   }
//   return id.toUpperCase().substring(0, length)
// }

module.exports = api
