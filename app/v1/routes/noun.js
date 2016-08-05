/**
 * noun.js: noun route
 *
 * (C) 2015, MADSquare Inc.
 * @version 0.0.1
 */

'use strict'

var router = require('express').Router()
var api = require('../../api')
var ctrl_noun = require('../ctrl/noun')

router.route('/')
.get(
  ctrl_noun.validator.values,
  function (req, res) {
    api.async(function * () {
      try {
        var results = yield ctrl_noun.extract.bind(null, req.query.values)

        api.send(req, res, {
          nouns: results,
          list: req.query.values
        })
      } catch (err) {
        api.error(err, req, res)
      }
    })
  }
)

module.exports = router
