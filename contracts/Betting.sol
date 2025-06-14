// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Betting {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function payout(address user, uint256 amount) public {
        require(balances[user] >= amount, "Not enough balance");
        balances[user] -= amount;
        payable(user).transfer(amount);
    }

    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }
}
