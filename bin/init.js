/**
 * init.js
 */
var async = require('async')

module.exports = {
  instanceId: function (cb) {
    var ec2meta = require('ec2-meta')
    ec2meta.load('instance-id', function (err, instanceId) {
      cb(null, err ? require('os').hostname() : instanceId)
    })
  },
  notifier: function (opts, cb) {
    var target = 'Logger'
    var conf = opts.notifier.logger

    if (opts.env.mode === 'product') {
      conf = opts.notifier.slack
      target = 'Slack'
    }

    conf.prefix = opts.notifier.prefix + ' - ' + ' (' + opts.env.instanceId + ')'
    cb(null, require('log-notifier')[target](conf))
  },
  logger: function (opts, cb) {
    var path = require('path')
    var fs = require('fs')
    var winston = require('winston')

    var dir = path.resolve(__dirname, '../', opts.path)
    if (fs.existsSync(dir) === false) {
      fs.mkdirSync(dir)
    }

    cb(null, new winston.Logger({
      transports: [
        new (winston.transports.File)({
          name: opts.name,
          filename: dir + '/' + opts.name + '.log',
          level: opts.level || 'info',
          maxsize: opts.maxsize || (1024 * 1024),
          maxFiles: opts.maxFiles || 10
        })
      ]
    }))
  },
  async: function (fn) {
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
  },
  client: {}
}
