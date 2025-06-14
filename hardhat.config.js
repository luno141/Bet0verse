require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();


const solc = require("solc");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
    networks: {
    monad: {
      url: "https://testnet-rpc.monad.xyz", // change if different
      accounts: [process.env.MONAD_PRIVATE_KEY],
    },
  },
};
