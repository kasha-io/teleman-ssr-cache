var index = (function (_temp) {
  var _ref = _temp === void 0 ? {} : _temp,
      _ref$variable = _ref.variable,
      variable = _ref$variable === void 0 ? '__SSR_CACHE__' : _ref$variable,
      _ref$mode = _ref.mode,
      mode = _ref$mode === void 0 ? !window[variable] && /Headless/i.test(navigator.userAgent) ? 'server' : 'client' : _ref$mode,
      cacheKeyGenerator = _ref.cacheKeyGenerator,
      onCached = _ref.onCached,
      onConsumed = _ref.onConsumed;

  var cache, script, serverIdleTimer, clientIdleTimer;

  if (mode === 'server') {
    cache = [];
    resetServerIdleTimer();
  } else {
    if (window[variable]) {
      cache = window[variable] = JSON.parse(decodeURI(window[variable]));
    }

    if (onConsumed) {
      if (!cache || !cache.length) {
        onConsumed();
        onConsumed = null;
      } else {
        resetClientIdleTimer();
      }
    }
  }

  function resetServerIdleTimer() {
    clearTimeout(serverIdleTimer);
    serverIdleTimer = setTimeout(function () {
      if (!script) {
        script = document.createElement('script');
        document.body.insertBefore(script, document.body.getElementsByTagName('script')[0] || null);
      }

      script.text = "var " + variable + " = \"" + encodeURI(JSON.stringify(cache)) + "\"";

      if (onCached) {
        onCached();
        onCached = null;
      }
    }, 400);
  }

  function resetClientIdleTimer() {
    clearTimeout(clientIdleTimer);

    if (onConsumed) {
      clientIdleTimer = setTimeout(function () {
        if (onConsumed) {
          onConsumed();
          onConsumed = null;
        }
      }, 400);
    }
  }

  return function (ctx, next) {
    if (!cache || ctx.options.method && ctx.options.method.toUpperCase() !== 'GET') {
      return next();
    }

    var key = cacheKeyGenerator ? cacheKeyGenerator(ctx) : ctx.url;
    var hit = cache.find(function (item) {
      return item.key === key;
    });

    if (mode === 'server') {
      if (hit) {
        return hit.body;
      }

      clearTimeout(serverIdleTimer);
      return next().then(function (body) {
        cache.push({
          key: key,
          body: JSON.parse(JSON.stringify(body)) // unreference

        });
        return body;
      })["finally"](resetServerIdleTimer);
    } else {
      resetClientIdleTimer();

      if (!hit) {
        return next()["finally"](resetClientIdleTimer);
      }

      cleanCache();
      return hit.body;
    }

    function cleanCache() {
      if (!cache) {
        return;
      }

      var i = cache.indexOf(hit);

      if (i === -1) {
        return;
      }

      cache.splice(i, 1);

      if (!cache.length) {
        cache = null;

        if (onConsumed) {
          clearTimeout(clientIdleTimer);
          setTimeout(function () {
            onConsumed();
            onConsumed = null;
          });
        }
      }
    }
  };
});

export default index;
//# sourceMappingURL=teleman-ssr-cache.js.map
