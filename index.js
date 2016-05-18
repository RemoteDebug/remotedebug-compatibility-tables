var express = require('express');
var _ = require('lodash');

var blink = require('./protocols/blink/protocol.json')

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
      pair: pair
    })
  })
  
  return commandPairs
    
} 

function getDomains() {
  return ['Console', 'CSS', 'Debugger', 'DOM', 'Page'].map(function(domainName) {
    return {
      name: domainName,
      runtimes: [
        {
          name: 'blink',
          protocol: getBlinkDomain(domainName),
        },
        {
          name: 'webkit',
          protocol: require('./protocols/webkit/' + domainName+ '.json')
        }
      ]      
    } 
  })
}

function getDomainByName(name) {
   var domain = getDomains().filter(i => i.name === name)

  if(domain.length) {
    return domain[0]
  }
  
  return null
}

function getBlinkDomain(name) {

  var domain = blink.domains.filter(function(item) {
    return item.domain === name
  })
  
  if(domain.length) {
    return domain[0]
  }
  
}