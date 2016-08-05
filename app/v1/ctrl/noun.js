/**
 * noun.js: noun controller
 *
 * (C) 2015, MADSquare Inc.
 * @version 0.0.1
 */

'use strict'

var api = require('../../api')
var _ = require('lodash')
var nka = require('node-korean-analyzer')

var ctrl = {}

ctrl.validator = {
  values: function (req, res, next) {
    var values = req.query.values
    if (typeof values === 'undefined' || typeof values[0] === 'undefined') {
      return api.error('common.missing_required_parameter', req, res)
    }
    next()
  }
}

ctrl.extract = function (list, cb) {
  var nounList = {}
  _.forEach(list, function (value) {
    console.log(value)
    var result = nka.neSync(value, {
      morph: true,
      offset: true
    })

    var lastEndPos = 0
    _.forEach(result, function (item) {
      if (item.morph) {
        if (lastEndPos > item.startPos) return
        lastEndPos = item.endPos
        var isNoun = item.morph[0].match(/(N)/)
        if (isNoun) {
          var value = item.morph[0].match(/(\S+)\(N\)/)
          if (value && value.length) {
            nounList[item.term] = nounList[value[1]] ? nounList[value[1]] + 1 : 1
          }
        }
      }
    })
  })

  cb(null, nounList)
}

module.exports = ctrl
