BET0VERSE TELEGRAM BOT DOCUMENTATION
====================================

OVERVIEW
--------
Bet0verse is a professional-grade Telegram bot that enables users to engage in on-chain prediction markets on the Monad testnet. It combines Telegram's chat interface with blockchain security for accessible market operations.

TECH STACK
----------
  Runtime:
  - Node.js (JavaScript runtime)
  - Telegraf (Telegram bot framework)
  - ethers.js (Ethereum/Monad interactions)

  Database:
  - PostgreSQL (Relational database)
  - Prisma ORM (Database client & migrations)

  Smart Contracts:
  - Solidity (Betting.sol)
  - Hardhat (Compile & deploy contracts)

  Configuration:
  - dotenv (Environment variable management)

SETUP & DEPLOYMENT
------------------
  1. Clone repository:
     git clone https://github.com/<username>/Bet0verse.git, 
     cd Bet0verse

  2. Install dependencies:
     npm install

  3. Configure environment:
     Create .env file with:
     - TELEGRAM_BOT_TOKEN
     - DATABASE_URL
     - MONAD_PRIVATE_KEY

  4. Database setup:
     npx prisma migrate dev --name init
     npx prisma generate

  5. Compile & deploy contract:
     npx hardhat compile
     npx hardhat run scripts/deploy.js --network monad
     (Copy address to utils/monad.js)

  6. Launch bot:
     node index.js

COMMAND REFERENCE
----------------
  /start        - Welcome message and instructions
  /help         - List all commands
  /register     - Create/update user profile
  /linkwallet   - Associate Monad testnet wallet
  /createbet    - Open new prediction market
  /listmarkets  - Browse open markets
  /placebet     - Stake on market outcome
  /resolvebets  - Close market and issue payouts
  /balance      - Check MONAD token balance
  /withdraw     - Initiate on-chain withdrawal

CONTRIBUTION GUIDELINES
-----------------------
  1. Fork the repository
  2. Create feature branch:
     git checkout -b feat/your-feature
  3. Commit changes:
     git commit -m "Add your feature"
  4. Push to branch:
     git push origin feat/your-feature
  5. Open pull request

ABOUT
-----
Developed for Monad Blitz Delhi, leveraging Monad's high-performance EVM. Combines Telegram accessibility with blockchain security for prediction markets.
