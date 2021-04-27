//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./Stacking.sol";

contract PotatoGame is ERC20, Ownable {
    using SafeCast for uint;
    using SafeCast for uint64;
    uint16 private version = 18;
    uint64 private _finishedAt = 0;
    uint64 private _price = 100000000 gwei; // 10^8 gwei = 0.1 ether
    uint64 private _duration = 100 hours; 
    uint64 private _timeUnit = 1 hours; 
    uint8 private _burnPrice = 10;
    address private _winner;
    Stacking private _stacking;
    constructor() ERC20("PotatoGame", "PGC") Ownable() {
    }

    modifier notGameOver() {
        require(_finishedAt == 0 || _finishedAt > block.timestamp, "Game over");
        _;
    }

    modifier gameOver() {
        require(_finishedAt <= block.timestamp, "Game not over");
        _;
    }

    modifier onlyWinner() {
        require(msg.sender == _winner, "Only for winners");
        _;
    }

    modifier stackerDefined() {
        require(address(_stacking) != address(0), "Stacking is not defined");
        _;
    }

    function setStake(Stacking stacking) external onlyOwner {
        _stacking = stacking;
    }

    function setDuration(uint64 duration) external onlyOwner {
        _duration = duration;
    }

    function setTimeUnit(uint64 timeUnit) external onlyOwner {
        _timeUnit = timeUnit;
    }

    function getFinishTime() external view returns (uint64) {
        return _finishedAt;
    }

    function getWinner() external view returns (address) {
        return _winner;
    }

    function _updateStarted() private {
        if ((_finishedAt - block.timestamp) < _timeUnit) {
            _finishedAt = (block.timestamp + _timeUnit).toUint64();
        } else {
            _finishedAt = (_finishedAt + _timeUnit).toUint64();
        }
    }

    function _startOrContinue() private {
        if (_finishedAt == 0) {
            _finishedAt = (block.timestamp + _duration).toUint64();
        } else {
            _updateStarted();
        }
    }

    function click() external payable notGameOver {
        require(msg.value == _price, "Only exact amount is accepted");
        _winner = msg.sender;
        _mint(msg.sender, 1);
        _startOrContinue();
    }

    function burn() external notGameOver {
        uint256 senderBalance = balanceOf(msg.sender);
        require(senderBalance >= _burnPrice , "Not enough tokens");
        _burn(msg.sender, _burnPrice);
        _winner = msg.sender;
        _startOrContinue();
    }
    
    function claimAward() external gameOver onlyWinner {
        require(address(this).balance > _price, "Not enough funds to return");
        _finishedAt = (block.timestamp + _duration).toUint64();
        _winner = msg.sender;
        _mint(msg.sender, 1);
        payable(msg.sender).transfer(address(this).balance - _price);
    }

    function stake(uint256 amount) external stackerDefined {
        uint256 senderBalance = balanceOf(msg.sender);
        require(senderBalance > 0, "No tokens found");
        require(senderBalance <= amount, "Not enough tokens");
        require(0 == amount, "Zero cannot be stacked");
        _burn(msg.sender, amount);
        _stacking.stake(msg.sender, amount);
    }

    function unstake(uint256 amount) external stackerDefined {
        bool result =_stacking.unstake(msg.sender, amount);
        if (result) {
            _mint(msg.sender, amount);
        }
    }

}