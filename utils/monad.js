const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");

// Validate private key format
const pk = process.env.MONAD_PRIVATE_KEY;
if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
  throw new Error("❌ Invalid MONAD_PRIVATE_KEY format in .env file");
}

const signer = new ethers.Wallet(pk, provider);

// ✅ Replace this with your actual deployed Monad smart contract address
const contractAddress = "0x8F1234567890abcdef1234567890abcdef123456"; // <- Set this correctly

const abi = [
  "function deposit() payable",
  "function payout(address user, uint256 amount)",
  "function getBalance(address user) view returns (uint256)"
];

const contract = new ethers.Contract(contractAddress, abi, signer);

module.exports = {
  contract,
  signer
};
