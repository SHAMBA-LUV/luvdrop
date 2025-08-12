#!/usr/bin/env node

/**
 * Fund Airdrop Contract Script
 * 
 * This script helps the contract owner fund the airdrop contract with LUV tokens.
 * It requires the owner to have sufficient LUV tokens and approve the airdrop contract.
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { polygon } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { AIRDROP_ABI, LUV_TOKEN_ABI, CONTRACT_ADDRESSES } from './abi.js';

// Configuration
const AIRDROP_ADDRESS = CONTRACT_ADDRESSES.AIRDROP;
const LUV_TOKEN_ADDRESS = CONTRACT_ADDRESSES.LUV_TOKEN;

// Load environment variables
const loadEnv = () => {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    });
    return env;
  } catch (error) {
    console.log('No .env file found, using process.env');
    return process.env;
  }
};

const env = loadEnv();

// Validate environment
if (!env.PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in environment variables');
  console.log('Please set your private key:');
  console.log('export PRIVATE_KEY=your_private_key_here');
  process.exit(1);
}

if (!AIRDROP_ADDRESS || AIRDROP_ADDRESS === '0x0000000000000000000000000000000000000000') {
  console.error('❌ AIRDROP_ADDRESS not configured');
  console.log('Please set the airdrop contract address in abi.js or .env');
  process.exit(1);
}

// Create clients
const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});

const account = privateKeyToAccount(env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: polygon,
  transport: http(),
});

console.log('🔗 Connected to Polygon Mainnet');
console.log(`👤 Owner Address: ${account.address}`);
console.log(`🎯 Airdrop Contract: ${AIRDROP_ADDRESS}`);
console.log(`🪙 LUV Token: ${LUV_TOKEN_ADDRESS}`);
console.log('');

// Check owner balance
const checkBalance = async () => {
  try {
    const balance = await publicClient.readContract({
      address: LUV_TOKEN_ADDRESS,
      abi: LUV_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    
    console.log(`💰 Owner LUV Balance: ${formatEther(balance)} LUV`);
    return balance;
  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
    return BigInt(0);
  }
};

// Check airdrop contract balance
const checkAirdropBalance = async () => {
  try {
    const balance = await publicClient.readContract({
      address: AIRDROP_ADDRESS,
      abi: AIRDROP_ABI,
      functionName: 'getTokenBalance',
    });
    
    console.log(`🏦 Airdrop Contract Balance: ${formatEther(balance)} LUV`);
    return balance;
  } catch (error) {
    console.error('❌ Error checking airdrop balance:', error.message);
    return BigInt(0);
  }
};

// Check allowance
const checkAllowance = async () => {
  try {
    const allowance = await publicClient.readContract({
      address: LUV_TOKEN_ADDRESS,
      abi: LUV_TOKEN_ABI,
      functionName: 'allowance',
      args: [account.address, AIRDROP_ADDRESS],
    });
    
    console.log(`✅ Allowance for Airdrop Contract: ${formatEther(allowance)} LUV`);
    return allowance;
  } catch (error) {
    console.error('❌ Error checking allowance:', error.message);
    return BigInt(0);
  }
};

// Approve tokens
const approveTokens = async (amount) => {
  try {
    console.log(`🔐 Approving ${formatEther(amount)} LUV for airdrop contract...`);
    
    const hash = await walletClient.writeContract({
      address: LUV_TOKEN_ADDRESS,
      abi: LUV_TOKEN_ABI,
      functionName: 'approve',
      args: [AIRDROP_ADDRESS, amount],
    });
    
    console.log(`⏳ Approval transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Approval confirmed in block ${receipt.blockNumber}`);
    
    return true;
  } catch (error) {
    console.error('❌ Approval failed:', error.message);
    return false;
  }
};

// Deposit tokens to airdrop contract
const depositTokens = async (amount) => {
  try {
    console.log(`💸 Depositing ${formatEther(amount)} LUV to airdrop contract...`);
    
    const hash = await walletClient.writeContract({
      address: AIRDROP_ADDRESS,
      abi: AIRDROP_ABI,
      functionName: 'depositTokens',
      args: [amount],
    });
    
    console.log(`⏳ Deposit transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Deposit confirmed in block ${receipt.blockNumber}`);
    
    return true;
  } catch (error) {
    console.error('❌ Deposit failed:', error.message);
    return false;
  }
};

// Get airdrop stats
const getAirdropStats = async () => {
  try {
    const stats = await publicClient.readContract({
      address: AIRDROP_ADDRESS,
      abi: AIRDROP_ABI,
      functionName: 'getAirdropStats',
    });
    
    console.log('\n📊 Airdrop Statistics:');
    console.log(`   Airdrop Amount: ${formatEther(stats[0])} LUV`);
    console.log(`   Total Claimed: ${formatEther(stats[1])} LUV`);
    console.log(`   Total Recipients: ${stats[2]}`);
    console.log(`   Contract Balance: ${formatEther(stats[3])} LUV`);
    console.log(`   Is Active: ${stats[4] ? 'Yes' : 'No'}`);
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting airdrop stats:', error.message);
    return null;
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting Airdrop Funding Process...\n');
  
  // Check balances and allowance
  const ownerBalance = await checkBalance();
  const airdropBalance = await checkAirdropBalance();
  const allowance = await checkAllowance();
  
  console.log('');
  
  // Get funding amount from command line or use default
  const fundingAmount = process.argv[2] ? parseEther(process.argv[2]) : parseEther('1000000'); // 1M LUV default
  
  console.log(`🎯 Target Funding Amount: ${formatEther(fundingAmount)} LUV`);
  
  if (ownerBalance < fundingAmount) {
    console.error(`❌ Insufficient balance. Need ${formatEther(fundingAmount)} LUV, have ${formatEther(ownerBalance)} LUV`);
    process.exit(1);
  }
  
  // Check if approval is needed
  if (allowance < fundingAmount) {
    console.log('🔐 Approval needed...');
    const approvalSuccess = await approveTokens(fundingAmount);
    if (!approvalSuccess) {
      console.error('❌ Approval failed. Cannot proceed with deposit.');
      process.exit(1);
    }
  } else {
    console.log('✅ Sufficient allowance already exists');
  }
  
  // Deposit tokens
  console.log('\n💸 Proceeding with deposit...');
  const depositSuccess = await depositTokens(fundingAmount);
  
  if (depositSuccess) {
    console.log('\n🎉 Airdrop funding completed successfully!');
    
    // Show updated stats
    await getAirdropStats();
    
    console.log('\n🔗 View on Polygonscan:');
    console.log(`   Airdrop Contract: https://polygonscan.com/address/${AIRDROP_ADDRESS}`);
    console.log(`   LUV Token: https://polygonscan.com/address/${LUV_TOKEN_ADDRESS}`);
  } else {
    console.error('\n❌ Airdrop funding failed');
    process.exit(1);
  }
};

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
