(function(){

  if (
    typeof self !== 'undefined' && !self.Prism ||
    typeof global !== 'undefined' && !global.Prism
  ) {
    return;
  }

  var index = 0;
  var shouldSearch = false;

  Prism.hooks.add('wrap', function(env) {

    // Specific hack

    if(document.querySelector('.meta') === null) {
      return false
    }

    var elmMeta = document.querySelector('.meta');
    var metadata = {
      domain: elmMeta.getAttribute('data-domain'),
      object: elmMeta.getAttribute('data-object'),
      runtime: elmMeta.getAttribute('data-runtime'),
    }
    
    if(env.type == 'property' && env.content === `"$ref"`) {
      index = 0
      shouldSearch = true
      console.log(env, env)
    }

    if(index && index == 2) {

      console.log('VAL', env)

      var objectRef = env.content.split('.').map(function(val) {
        return val.replace('"', '')
      });

      if(objectRef.length >1) {
        metadata.domain = objectRef[0]
        metadata.object = objectRef[1]
      } else {
        metadata.object = objectRef[0]
      }

      var url = [location.origin, metadata.domain, metadata.runtime, 'types', metadata.object].join('/')
      env.tag = 'a';
      env.attributes.href = url;

      index = 0;
      shouldSearch = false
    }

    if(shouldSearch) {
      index = index +1;
    }

  });

})();