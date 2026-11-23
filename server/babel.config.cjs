// Used only by Jest, so tests can import the server's ES modules.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
}
