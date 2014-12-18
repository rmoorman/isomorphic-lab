'use strict';

var path = require('path')
var querystring = require('querystring')

var bodyParser = require('body-parser')
var compression = require('compression')
var errorhandler = require('errorhandler')
var express = require('express')
var favicon = require('serve-favicon')
var logger = require('morgan')
var serveStatic = require('serve-static')
var session = require('express-session')

var assign = require('react/lib/Object.assign')
var forms = require('newforms')
var React = require('react')
var Router = require('react-router')

var app = express()
var pkg = require('../package.json')
var fetchData = require('./fetchData')
var {ThingForm} = require('./forms')
var routes = require('./routes')

app.set('host', process.env.HOST || '0.0.0.0')
app.set('port', process.env.PORT || 3000)
app.set('views', path.join(__dirname, '../views'))
app.use(logger('dev'))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(compression())
app.use(favicon(path.join(__dirname, '../static/favicon.ico')))
app.use(serveStatic(path.join(__dirname, '../static')))
app.use(session({secret: process.env.SECRET, resave: false, saveUninitialized: true}))

var THINGS = [
  {name: 'First thing', price: '42.42', description: 'The very first thing'}
]

app.get('/api/things', (req, res, next) => {
  res.json(THINGS)
})

app.post('/api/addthing', (req, res, next) => {
  var form = new ThingForm({data: req.body})
  // Extra validation to test display of server-only validation errors
  form.cleanName = function() {
    if (this.cleanedData.name == 'First thing') {
      throw forms.ValidationError('This is a reserved name - please choose another.')
    }
  }
  if (form.isValid()) {
    THINGS.push(form.cleanedData)
    res.status(200).type('html').end()
  }
  else {
    res.status(400).json(form.errors().toJSON())
  }
})

function renderApp(url, redirectData, cb) {
  var router = Router.create({
    routes: routes
  , location: url
  , onAbort: cb
  })

  router.run((Handler, state) => {
    fetchData(state.routes, state.params, (err, data) => {
      data = assign(redirectData, data)
      var html = React.renderToString(<Handler data={data}/>)
      cb(null, html, JSON.stringify(data))
    })
  })
}

app.use((req, res, next) => {
  var redirectData = {}
  var url = req.url
  // Use query params to pass POST data to willTransitionTo
  if (req.method == 'POST') {
    url += `?_method=${req.method}&${querystring.stringify(req.body)}`
  }
  else if (req.session.redirectData) {
    redirectData = req.session.redirectData
    delete req.session.redirectData
  }

  renderApp(url, redirectData, (redirect, html, data) => {
    if (redirect) {
      req.session.redirectData = redirect.query
      res.redirect(303, redirect.to)
    }
    else {
      res.render('react.jade', {html: html, data: data})
    }
  })
})

if ('development' == app.get('env')) {
  app.use(errorhandler())
}

app.listen(app.get('port'), app.get('host'), () => {
  console.log(
    `${pkg.name} server listening on http://${app.get('host')}:${app.get('port')}`
  )
})