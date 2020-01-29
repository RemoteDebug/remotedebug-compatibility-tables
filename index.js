var express = require('express')
var _ = require('lodash')
var serveStatic = require('serve-static')
var path = require('path')

var defaultFilter = {
  runtimes: ['Chrome (CDP 1.3)', 'Edge 0.1', 'Edge 0.2 (preview)', 'Firefox (CDP 1.3)', 'Node (CDP 1.3)', 'Safari iOS 10.0']
}

var runtimes = [
  {
    name: 'Chrome (CDP 1.3)',
    protocol: require('./protocols/chrome/protocol_13.json'),
    icon: 'chrome.svg'
  },
  {
    name: 'Chrome (CDP 1.2)',
    protocol: require('./protocols/chrome/protocol_12.json'),
    icon: 'chrome.svg'
  },
  {
    name: 'Chrome (CDP 1.1)',
    protocol: require('./protocols/chrome/protocol_11.json'),
    icon: 'chrome.svg'
  },
  {
    name: 'Edge 0.1',
    protocol: require('./protocols/edge/protocol.01.json'),
    icon: 'edge.svg'
  },
  {
    name: 'Edge 0.2 (preview)',
    protocol: require('./protocols/edge/protocol.02.json'),
    icon: 'edge.svg'
  },
  {
    name: 'Firefox (CDP 1.3)',
    protocol: require('./protocols/firefox/protocol_13.json'),
    icon: 'firefox.svg'
  },
  {
    name: 'Node (CDP 1.3)',
    protocol: require('./protocols/node/protocol_13.json'),
    icon: 'nodejs.svg'
  },
  {
    name: 'Node (CDP 1.2)',
    protocol: require('./protocols/node/protocol_12.json'),
    icon: 'nodejs.svg'
  },
  {
    name: 'Safari iOS 10.0',
    protocol: require('./protocols/webkit/iOS-10.0.json'),
    icon: 'safari-ios.svg'
  },
  {
    name: 'Safari iOS 9.3',
    protocol: require('./protocols/webkit/iOS-9.3.json'),
    icon: 'safari-ios.svg'
  },
  {
    name: 'Safari iOS 9.0',
    protocol: require('./protocols/webkit/iOS-9.0.json'),
    icon: 'safari-ios.svg'
  },
  {
    name: 'Safari iOS 8.0',
    protocol: require('./protocols/webkit/iOS-8.0.json'),
    icon: 'safari-ios.svg'
  },
  {
    name: 'Safari iOS 7.0',
    protocol: require('./protocols/webkit/iOS-7.0.json'),
    icon: 'safari-ios.svg'
  }
]

var app = express()
app.engine('ejs', require('ejs-locals'))
app.set('port', process.env.PORT || 8080)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

app.use(serveStatic(path.join(__dirname, '/assets')))

var handleFilters = function (req, res, next) {
  req.filter = Object.assign({}, defaultFilter)

  if (req.query.runtimes) {
    req.filter.isDefault = false
    req.filter.runtimes = req.query.runtimes.split(',')
  } else {
    req.filter.isDefault = true
  }

  next()
}

app.get('/', handleFilters, function (req, res) {
  var domains = getDomains().map(d => getDomainInfo(d.name))

  res.render('index', {
    _layoutFile: 'layout',
    domains: domains,
    runtimes: runtimes,
    filter: req.filter
  })
})

app.get('/:domain', handleFilters, function (req, res) {
  var domain = getDomainInfo(req.params.domain)
  if (!domain) {
    return res.render('404')
  }

  res.render('domain', {
    _layoutFile: 'layout',
    filter: req.filter,
    domain: domain,
    runtimes: runtimes,
    commands: generateCompatibilityPairs(domain, 'commands', 'name'),
    events: generateCompatibilityPairs(domain, 'events', 'name'),
    types: generateCompatibilityPairs(domain, 'types', 'id')
  })
})

app.get('/:domain/:runtime/:type/:object', handleFilters, function (req, res) {
  var domain = getDomainInfo(req.params.domain)

  if (!domain) {
    return res.render('404')
  }

  var runtime = getRuntimeByName(req.params.runtime)
  if (!runtime) {
    return res.render('404')
  }

  var protocol = _.find(domain.runtimes, i => i.name === req.params.runtime).protocol
  if (!protocol) {
    return res.render('404')
  }

  var subProtocol = protocol[req.params.type]
  if (!subProtocol) {
    return res.render('404')
  }

  var object = _.find(subProtocol, i => i.name === req.params.object || i.id === req.params.object)
  if (!object) {
    return res.render('404')
  }

  res.render('object', {
    _layoutFile: 'layout',
    filter: req.filter,
    domain: domain,
    runtime: runtime,
    object: object
  })
})

app.listen(app.get('port'), function () {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.settings.env)
})

function isPartOfCore (commands) {
  return commands[0].runtime === 'RemoteDebug Core'
}

function generateCompatibilityPairs (domain, type, propertyKey) {
  var runtimes = domain.runtimes || []
  var runtimesCount = runtimes ? runtimes.length : 0

  var commands = new Map()

  runtimes.forEach(function (runtime, index) {
    if (runtime.protocol && runtime.protocol[type]) {
      runtime.protocol[type]
        .sort(function (a, b) {
          var x = a[propertyKey]
          var y = b[propertyKey]
          return ((x < y) ? -1 : ((x > y) ? 1 : 0))
        })
        .forEach(function (command) {
          var cItem = {
            runtime: runtime.name,
            command: command
          }

          if (commands.has(command[propertyKey])) {
            var entry = commands.get(command[propertyKey])
            entry.push(cItem)
          } else {
            commands.set(command[propertyKey], [cItem])
          }
        })
    }
  })

  var commandPairs = []
  commands.forEach(function (command, key) {
    var pair = _.fill(Array(runtimesCount), null)

    command.forEach(function (item) {
      var runtime = _.find(runtimes, r => r.name === item.runtime)
      var runtimeIndex = runtimes.indexOf(runtime)
      pair[runtimeIndex] = {
        name: item.command[propertyKey],
        object: item.command
      }
    })

    commandPairs.push({
      isPartOfCore: isPartOfCore(command, propertyKey),
      pair: pair,
      flat: _.compact(pair)[0]
    })
  })

  return commandPairs
}

function getDomains () {
  // Create unique list of domains
  var domains = []
  runtimes.forEach(function (runtime) {
    var rDomains = runtime.protocol.domains.map(d => d.domain)
    domains = domains.concat(rDomains)
  })
  domains = _.uniq(domains)

  // Return collection of domains mapped to runtime protocol section
  return domains.map(function (domainName) {
    return {
      name: domainName,
      runtimes: runtimes.map(function (runtime) {
        return {
          name: runtime.name,
          icon: runtime.icon,
          protocol: getDomainForRuntime(runtime.protocol, domainName)
        }
      })

    }
  }).sort((a, b) => {
    return a.name.localeCompare(b.name)
  })
}

function getDomainInfo (domainName) {
  var domain = getDomainByName(domainName)

  var info = domain || {}
  var protocols = domain && domain.runtimes && domain.runtimes.length ? _.compact(domain.runtimes.map(r => r.protocol)) : []

  if (protocols.length) {
    info.description = protocols[0].description
    info.isExperimental = protocols[0].experimental | protocols[0].hidden
  }

  return info
}

function getDomainByName (name) {
  return _.find(getDomains(), i => i.name === name)
}

function getRuntimeByName (name) {
  return _.find(runtimes, i => i.name === name)
}

function getDomainForRuntime (protocol, name) {
  return _.find(protocol.domains, item => item.domain === name)
}
