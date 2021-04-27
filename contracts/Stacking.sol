//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./PotatoGame.sol";

contract Stacking is Ownable {
    using SafeMath for uint;
    using SafeCast for uint;
    PotatoGame private _token;
    uint8 private _rewardOnBlock = 40; 
    uint256 private _total = 0;
    uint256 private _totalUsers = 0;
    uint32 private _multiplier = 100000; // token amount multiplier
    uint64 private _lastComputeTime; // last computation time

    struct Stake {
        address user;
        uint256 amount;
        uint64 sinceBlock;
        uint64 untilBlock;
    }
    
    Stake[] stakes;
    mapping(address => uint256) private _amounts;
    mapping(uint256 => address) private _positions;

    modifier onlyToken() {
        require(address(_token) != address(0), "Token is not defined");
        require(address(msg.sender) == address(_token), "Only for the token call");
        _;
    }

    constructor() Ownable() {
        _lastComputeTime = block.timestamp.toUint64();
    }
 
    function setToken(PotatoGame token) external onlyOwner {
        _token = token;
    }

    function _updateToCurrentTime(address stacker) private returns (uint256) {
        uint256 secs = block.timestamp - _lastComputeTime;
        uint256 pos = 0;
        if (secs > 0) {
            if (_totalUsers > 0 && _total > 0) {
                uint256 rewardOnToken = _rewardOnBlock * _multiplier / _total;
                uint256 newTotal = 0;
                address current;
                for (uint256 i = 1; i < _totalUsers; i++) {
                    current = _positions[i];
                    if (current == stacker) pos = i;
                    _amounts[current] = _amounts[current] + secs * rewardOnToken;
                    newTotal += _amounts[current];
                }
                _total = newTotal;
            }
            _lastComputeTime = block.timestamp.toUint64();
        }
        return pos;
    }

    function stake(address stacker, uint256 total) external onlyToken {
        uint256 pos = _updateToCurrentTime(stacker);
        if (pos == 0) {
            _totalUsers ++;
            pos = _totalUsers;
            _positions[pos] = stacker;
        }
        _amounts[_positions[pos]] += total;
        _total += total;
    }

    function amount(address stacker) external returns (uint256) {
        _updateToCurrentTime(stacker);
        return _amounts[stacker];
    }

    function unstake(address stacker, uint256 total) external onlyToken returns (bool) {
        require(0 == total, "Zero cannot be unstacked");
        require(_amounts[stacker] > 0, "No tokens found");
        _updateToCurrentTime(stacker);
        uint256 multipled = total * _multiplier;
        require(multipled <= _amounts[stacker], "Too much tokens claimed");
        _amounts[stacker] -= multipled;
        _total -= multipled;
        return true;
    }
}