/**
 * noun.js: noun route
 *
 * (C) 2015, MADSquare Inc.
 * @version 0.0.1
 */

'use strict'

var router = require('express').Router()
var api = require('../../api')
var _ = require('lodash')
var ctrl_noun = require('../ctrl/noun')
var config = require('../../../conf/config.json')

router.route('/')
.put(
  ctrl_noun.validator.values,
  function (req, res) {
    api.async(function * () {
      try {
        var results = yield ctrl_noun.extract.bind(null, req.body.values)
        var mainHashtags = []
        var subHashtags = []

        _.forEach(results, function (value, key) {
          if (value > 1) {
            mainHashtags.push(key)
          } else {
            subHashtags.push(key)
          }
        })

        if (mainHashtags.length > 0) {
          api.request({
            url: ['/cards/', req.body.ca_no, '/hashtags'].join(''),
            method: 'POST',
            data: {
              keywords: mainHashtags
            },
            auth: config.manager
          }, function (err, result) {
            if (err) {
              console.error(err)
            }

            api.logout()
          })
        }

        if (subHashtags.length > 0) {
          api.request({
            url: ['/cards/', req.body.ca_no, '/hashtags/sub'].join(''),
            method: 'POST',
            data: {
              keywords: subHashtags
            },
            auth: config.manager
          }, function (err, result) {
            if (err) {
              console.error(err)
            }

            api.logout()
          })
        }

        api.send(req, res, {
          nouns: results,
          list: req.body.values
        })
      } catch (err) {
        api.error(err, req, res)
      }
    })
  }
)

module.exports = router
