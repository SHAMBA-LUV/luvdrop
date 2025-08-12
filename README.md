# SHAMBA LUV Airdrop UI

A complete interaction interface for the ShambaLuvAirdrop.sol smart contract deployed on Polygon Mainnet.

## Features

### User Features
- **Wallet Connection**: Connect with MetaMask or other injected wallets
- **Airdrop Claiming**: One-click claiming of LUV tokens
- **Real-time Stats**: Live display of airdrop statistics
- **Transaction Logging**: Complete transaction history with Polygonscan links
- **Balance Display**: User and contract balance monitoring

### Admin Features (Contract Owner Only)
- **Airdrop Configuration**: Set airdrop amounts and activation status
- **Token Management**: Deposit and withdraw tokens from the contract
- **Emergency Functions**: Emergency withdrawal of all tokens
- **Token Rescue**: Rescue accidentally sent tokens
- **Owner Controls**: Full administrative access to contract functions

## Contract Functions Supported

### View Functions
- `getAirdropStats()` - Get comprehensive airdrop statistics
- `hasUserClaimed(address)` - Check if user has claimed
- `isAirdropActive()` - Check if airdrop is active
- `getTokenBalance()` - Get contract token balance
- `defaultToken()` - Get default token address
- `owner()` - Get contract owner

### User Functions
- `claimAirdrop()` - Claim airdrop tokens
- `claimAirdropForToken(address)` - Claim for specific token

### Admin Functions
- `setAirdropAmount(uint256)` - Set airdrop amount
- `setAirdropConfig(address, uint256, bool)` - Configure airdrop for specific token
- `depositTokens(uint256)` - Deposit tokens to contract
- `withdrawTokens(uint256)` - Withdraw tokens from contract
- `emergencyWithdraw()` - Emergency withdraw all tokens
- `rescueTokens(address, address, uint256)` - Rescue specific tokens
- `rescueAllTokens(address, address)` - Rescue all tokens of a type

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   VITE_AIRDROP_CONTRACT_ADDRESS=0x_your_deployed_airdrop_contract_address
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Usage

### For Users
1. Connect your wallet (MetaMask recommended)
2. Check your eligibility and claim status
3. Click "Claim Airdrop" if eligible
4. Monitor transaction logs for confirmation

### For Contract Owner
1. Connect the owner wallet
2. Click "Admin Mode" to access administrative functions
3. Use the admin panel to:
   - Set airdrop amounts
   - Deposit/withdraw tokens
   - Configure airdrop settings
   - Emergency withdraw if needed
   - Rescue accidentally sent tokens

## Network Configuration

- **Network**: Polygon Mainnet
- **Chain ID**: 137
- **Explorer**: https://polygonscan.com
- **Token**: SHAMBA LUV (LUV)

## Transaction Logging

All transactions are logged with:
- Transaction type and status
- Timestamp
- Direct links to Polygonscan
- Success/error status tracking

## Security Features

- Owner-only access to administrative functions
- Input validation for all user inputs
- Error handling for failed transactions
- Emergency withdrawal capabilities
- Token rescue functions for accidental transfers

## Contract Addresses

- **Airdrop Contract**: Set via environment variable
- **LUV Token**: `0x1035760d0f60B35B63660ac0774ef363eAa5456e`

## Dependencies

- React 18
- Wagmi v2
- Viem
- Tailwind CSS
- TypeScript

## Development

The UI is built with modern React patterns and includes:
- TypeScript for type safety
- Tailwind CSS for styling
- Wagmi for blockchain interactions
- Real-time transaction monitoring
- Responsive design for all devices

## License

MIT License - see LICENSE file for details
