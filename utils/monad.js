const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = "0xYOUR_DEPLOYED_ADDRESS"; // <- Replace this
const abi = [
  "function deposit() payable",
  "function payout(address user, uint256 amount)",
  "function getBalance(address user) view returns (uint256)"
];

const contract = new ethers.Contract(contractAddress, abi, signer);

module.exports = contract;
