var HDWalletProvider = require('truffle-hdwallet-provider');
const {MNEMONIC, key} = require('./secrets.js');
module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  compilers: {
    solc: {
      version: '0.8.0'
    }
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*' // Match any network id
    },
    ropsten: {
      // must be a thunk, otherwise truffle commands may hang in CI
      provider: () => new HDWalletProvider(MNEMONIC, 'https://ropsten.infura.io/v3/'+key),
      network_id: '3'
    }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: 'INTKDNX6VRVXCFWSMBPG5WFK4IINIS6EQV'
  },
  mocha: {
    timeout: 120000 // Here is 2min but can be whatever timeout is suitable for you.
  }
};
