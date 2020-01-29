'use strict'

var fs = require('fs')
var request = require('request-promise')

var fetchProtocol = () => {
  return new Promise((resolve, reject) => {
    var url = 'https://chromium.googlesource.com/v8/v8/+/master/include/js_protocol-1.3.json?format=TEXT'
    return request(url).then(body => {
      var protocol = JSON.parse(Buffer.from(body, 'base64').toString('utf8'))
      resolve(protocol)
    })
  })
}

fetchProtocol().then(protocol => {
  const { version: { major, minor } } = protocol;
  fs.writeFile(`protocols/node/protocol_${major}${minor}.json`, JSON.stringify(protocol, null, 2), function (err) {
    if (err) {
      console.log(err)
    } else {
      console.log('Node Protocol JSON file generated')
    }
  })
}).catch(err => {
  console.log('err', err)
})
