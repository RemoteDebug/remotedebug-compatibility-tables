var express = require('express');
var _ = require('lodash');

var protocols = {
  blink: require('./protocols/blink/protocol.json'),
  edge: require('./protocols/edge/protocol.json'),
  ios7: require('./protocols/webkit/iOS-7.0.json'),
  ios8: require('./protocols/webkit/iOS-8.0.json'),
  ios9: require('./protocols/webkit/iOS-9.0.json'),
  ios93: require('./protocols/webkit/iOS-9.3.json'),
  node: require('./protocols/node/protocol.json')
}

var app = express();
app.engine('ejs', require('ejs-locals'));

app.set('port', process.env.PORT || 8080);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/assets'));

app.get('/', function(req, res) {
  res.render('index', {
      _layoutFile: 'layout',
      domains: getDomains()
  })
});

app.get('/:domain', function(req, res) {
  
  var domain = getDomainByName(req.params.domain)  
  if(!domain) {
    return res.render('404')
  } 
                        
  res.render('domain', {
      _layoutFile: 'layout',
      domain: domain,
      commands: generateCompatibilityPairs(domain, 'commands', 'name'),
      events: generateCompatibilityPairs(domain, 'events', 'name'),
      types: generateCompatibilityPairs(domain, 'types', 'id')
  })
  
});

app.listen(app.get('port'), function(){
    console.log("Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
});

function generateCompatibilityPairs(domain, type, propertyKey) {
  var runtimes = domain.runtimes  
  var runtimesCount = runtimes.length
  
  var commands = new Map()
  
  runtimes.forEach(function(runtime, index) {     
    if(runtime.protocol && runtime.protocol[type]) {
      runtime.protocol[type]
        .sort(function(a, b) {
          var x = a[propertyKey]; var y = b[propertyKey]
          return ((x < y) ? -1 : ((x > y) ? 1 : 0))
        })
        .forEach(function(command) {
          var cItem = {
            runtime: runtime.name,
            command: command
          }
          
          if(commands.has(command[propertyKey])) {
            var entry = commands.get(command[propertyKey])
            entry.push(cItem)
          } else {
            commands.set(command[propertyKey], [cItem])
          }
        }) 
      }   
  })
  
  var commandPairs = []
  commands.forEach(function(command, key) {
    var pair = _.fill(Array(runtimesCount), null)
    
    command.forEach(function(item) {
      var runtime = _.find(runtimes, r => r.name === item.runtime)
      var runtimeIndex = runtimes.indexOf(runtime)
      pair[runtimeIndex] = {
        name: item.command[propertyKey],
        object: item.command
      }
    })
    
    var namePairs = pair.map(i => i ? i[propertyKey] : null)
    var hasParity = namePairs.every(i => i === namePairs[0])
    
    commandPairs.push({
      hasParity: hasParity,
      pair: pair,
      flat: _.compact(pair)[0]
    })
  })
  
  return commandPairs
    
} 

function getDomains() {
  return [
    'Inspector',
    'Memory',
    'Page',
    'Rendering',
    'Emulation',
    'Runtime',
    'Console',
    'Security',
    'Network',
    'Database',
    'IndexedDB',
    'CacheStorage',
    'DOMStorage',
    'ApplicationCache',
    'DOM',
    'CSS',
    'IO',
    'Debugger',
    'DOMDebugger',
    'Profiler',
    'HeapProfiler',
    'Worker',
    'ServiceWorker',
    'Input',
    'LayerTree',
    'DeviceOrientation',
    'Tracing',
    'Animation',
    'Accessibility',
    'Storage'
    ].sort().map(function(domainName) {
    return {
      name: domainName,
      runtimes: [
        {
          name: 'Chrome',
          protocol: getDomainForRuntime('blink', domainName),
        },
        {
          name: 'Edge',
          protocol: getDomainForRuntime('edge', domainName)
        },
        {
          name: 'Node (V8)',
          protocol: getDomainForRuntime('node', domainName)
        },
        {
          name: 'iOS 9.3',
          protocol: getDomainForRuntime('ios93', domainName)
        },
        {
          name: 'iOS 9.0',
          protocol: getDomainForRuntime('ios9', domainName)
        }, 
        {
          name: 'iOS 8.0',
          protocol: getDomainForRuntime('ios8', domainName)
        },                               
        {
          name: 'iOS 7.0',
          protocol: getDomainForRuntime('ios7', domainName)
        },
      ]      
    } 
  })
}

function getDomainByName(name) {
   return _.find(getDomains(), i => i.name === name)
}

function getDomainForRuntime(runtime, name) {
  return _.find(protocols[runtime].domains, item => item.domain === name)
}