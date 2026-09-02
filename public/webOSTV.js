if (typeof webOS === 'undefined') {
  window.webOS = {
    platform: { tv: true },
    fetchAppId: function() { return 'in.jojoapp.jojo'; },
    fetchAppInfo: function(cb) { if (cb) cb({ id: 'in.jojoapp.jojo', version: '1.0.0' }); },
    deviceInfo: function(cb) { if (cb) cb({ modelName: 'LG webOS TV', sdkVersion: '7.0.0' }); },
    keyboard: { isShowing: function() { return false; } }
  };
}
if (typeof webOSDev === 'undefined') {
  window.webOSDev = {
    launch: function() {},
    getPath: function() { return ''; }
  };
}
