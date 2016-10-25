var fs = require("fs");

var toml = require("toml"),
    webpack = require("webpack");

var linkPrefix = toml.parse(fs.readFileSync("./config.toml")).linkPrefix;

exports.modifyWebpackConfig = function(config, env) {
  config.plugin("provide", webpack.ProvidePlugin, [{
    fetch: "imports?this=>global!exports?global.fetch!whatwg-fetch",
    $: "jquery",
    jQuery: "jquery",
    "window.jQuery": "jquery",
  }]);

  return config;
};
