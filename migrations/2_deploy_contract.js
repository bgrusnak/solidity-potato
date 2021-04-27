var PotatoGame = artifacts.require('./PotatoGame.sol');
var Stacking = artifacts.require('./Stacking.sol');

var potato;
module.exports = function(deployer) {
  deployer
    .deploy(PotatoGame)
    .then(function() {
      return deployer.deploy(Stacking);
    })
    .then(function() {
      return PotatoGame.deployed();
    })
    .then(function(instance) {
      potato = instance;
      return Stacking.deployed();
    })
    .then(function(stake) {
      potato.setStake(stake.address);
      stake.setToken(potato.address);
    });
};
