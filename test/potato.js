const { time, expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const sleep = require('sleep-promise');

const jsonPotato = require('./../build/contracts/PotatoGame.json');
const jsonStacking = require('./../build/contracts/Stacking.json');

const price = 100000000000000000;

const cycle = 10;
const minimal = 5;

let accounts;
let potato;
let stacking;
let owner;
let finishTime;

const delay = async (sec) => {
  await time.increase(sec);
  await sleep(sec * 1000);
};

before(async () => {
  accounts = await web3.eth.getAccounts();
  owner = accounts[0];
  potato = await new web3.eth.Contract(jsonPotato.abi)
    .deploy({ data: jsonPotato.bytecode })
    .send({ from: owner, gas: '3000000' });
  stacking = await new web3.eth.Contract(jsonStacking.abi)
    .deploy({ data: jsonStacking.bytecode })
    .send({ from: owner, gas: '3000000' });
  await potato.methods.setDuration(cycle).send({ from: owner, gas: '1000000' });
  await potato.methods.setTimeUnit(minimal).send({ from: owner, gas: '1000000' });
  await time.increaseTo(Date.now());
});

describe('PotatoGame', function() {
  it('Should not accept incorrect price', async function() {
    await expectRevert(
      potato.methods.click().send({ from: accounts[0], value: price + 10, gas: '1000000' }),
      'Only exact amount is accepted'
    );
  });
  it('Empty on start', async function() {
    expect(await potato.methods.getFinishTime().call()).to.eql('0');
  });
  it('First start', async function() {
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    expect(Number(await potato.methods.getFinishTime().call())).to.eql(
      (await web3.eth.getBlock('latest')).timestamp + cycle
    );
  });
  it('First player', async function() {
    expect(await potato.methods.getWinner().call()).to.eql(accounts[0]);
  });
  it('Next player', async function() {
    finishTime = Number(await potato.methods.getFinishTime().call());
    await potato.methods.click().send({ from: accounts[1], value: price, gas: '1000000' });
    expect(await potato.methods.getWinner().call()).to.eql(accounts[1]);
  });
  it('Next player time', async function() {
    expect(Number(await potato.methods.getFinishTime().call())).to.eql(finishTime + minimal);
  });
  it('Spending too much', async function() {
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
    await potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' });
  });
  it('Third player wait so long', async function() {
    const sec = cycle - 2;
    finishTime = Number(await potato.methods.getFinishTime().call()) + minimal;
    await delay(sec);
    await potato.methods.click().send({ from: accounts[2], value: price, gas: '1000000' });
    expect(await potato.methods.getWinner().call()).to.eql(accounts[2]);
  });
  it('Game over', async function() {
    await delay(cycle*10);
    await expectRevert(
      potato.methods.click().send({ from: accounts[0], value: price, gas: '1000000' }),
      'Game over'
    );
  });
  it('The winner is defined', async function() {
    expect(await potato.methods.getWinner().call()).to.eql(accounts[2]);
  });

  it('Tokens assigned', async function() {
    expect(await potato.methods.balanceOf(accounts[0]).call()).to.eql('10');
    expect(await potato.methods.balanceOf(accounts[1]).call()).to.eql('1');
    expect(await potato.methods.balanceOf(accounts[2]).call()).to.eql('1');
  });

  it('Cannot steal award', async function() {
    await expectRevert(potato.methods.claimAward().send({ from: accounts[0], gas: '1000000' }), 'Only for winners');
  });

  it('Get award', async function() {
    const old = await web3.eth.getBalance(accounts[2]);
    await potato.methods.claimAward().send({ from: accounts[2], gas: '1000000' });
    const award = (await web3.eth.getBalance(accounts[2]) ) - old;
    expect(award).to.gt(2 * price);
  });
  it('New game started', async function() {
    expect(Number((await web3.eth.getBlock('latest')).timestamp)).to.be.lt(
      Number(await potato.methods.getFinishTime().call())
    );
  });
  it('Use tokens for the bid', async function() {
    await potato.methods.burn().send({ from: accounts[0], gas: '1000000' });
    expect(await potato.methods.getWinner().call()).to.eql(accounts[0]);
  });
});
