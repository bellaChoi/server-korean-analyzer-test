/**
 * api.js: api route
 *
 * (C) 2015, MADSquare Inc.
 * @version 0.0.1
 */

'use strict'

var router = require('express').Router()
var api = require('../../api')

router.route('/')
/**
 * 모든 API 요청에서 처리되어야 할 기본 처리 사항 정의
 */
.all(
    // api.init,
    api.validator.param
)

module.exports = router
