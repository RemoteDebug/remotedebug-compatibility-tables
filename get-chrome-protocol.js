'use strict'

var fs = require('fs')
var request = require('request-promise')

var fetchChromeProtocol = () => {

  return new Promise((resolve, reject) => {
    var protocol = {
      version: { 'major': '1', 'minor': '2' },
      domains: []
    }

    var urls = [
      'https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT',
      'https://chromium.googlesource.com/v8/v8/+/master/src/inspector/js_protocol.json?format=TEXT'
    ]

    var fetchedProtocols = urls.map(url => {
      return request(url).then(body => {
        return JSON.parse(Buffer.from(body, 'base64').toString('utf8'))
      })
    })

    Promise.all(fetchedProtocols).then(protocols => {
      var mergedDomains = []
      protocols.forEach(protocol => {
        mergedDomains.push(...protocol.domains)
      })

      protocol.domains = mergedDomains
      resolve(protocol)
    })
  })
}

fetchChromeProtocol().then(protocol => {
  fs.writeFile('protocols/chrome/protocol.json', JSON.stringify(protocol, null, 2), function (err) {
    if (err) {
      console.log(err)
    } else {
      console.log('Chrome Protocol JSON file generated')
    }
  })
}).catch(err => {
  console.log('err', err)
})
