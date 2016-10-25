const webpack = require("webpack");

exports.modifyWebpackConfig = function(config, env) {
  config.plugin("provide", webpack.ProvidePlugin, [{
    fetch: "imports?this=>global!exports?global.fetch!whatwg-fetch",
    $: "jquery",
    jQuery: "jquery",
    "window.jQuery": "jquery",
  }]);

  return config;
};
