import React, { useState, useEffect } from 'react';
import { parseEther, formatEther, type Address } from 'viem';
import { useAccount, useConnect, useDisconnect, useBalance, useContractRead, useContractWrite } from 'wagmi';
import { AIRDROP_ABI, LUV_TOKEN_ABI } from './abi';

// Contract addresses - Updated with actual deployed contract
const AIRDROP_ADDRESS = "0x583F6D336E777c461FbfbeE3349D7D2dA9dc5e51" as Address;
const LUV_TOKEN_ADDRESS = "0x1035760d0f60B35B63660ac0774ef363eAa5456e" as Address;

// Special wallet addresses
const OWNER_ADDRESS = "0x16666644043AECB616A061F0AF42745d0d7390c4" as Address;
const FUNDING_ADDRESS = "0x4F87FED88d1D48dA0434Db3E533722FEd988888D" as Address;

interface TransactionLog {
  id: string;
  type: 'claim' | 'deposit' | 'withdraw' | 'config' | 'emergency' | 'rescue' | 'approval';
  status: 'pending' | 'success' | 'error';
  hash?: string;
  message: string;
  timestamp: Date;
  details?: string;
}

interface AirdropStatus {
  isActive: boolean;
  hasEnded: boolean;
  reason?: string;
  remainingTokens: bigint;
}

export function AirdropUI() {
  // Wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // State management
  const [message, setMessage] = useState("Connect your wallet to interact with the SHAMBA LUV Airdrop");
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  
  // Admin form states
  const [newAirdropAmount, setNewAirdropAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [fundingAmount, setFundingAmount] = useState("");

  // Contract reads - Real contract integration
  const { data: airdropBalance } = useBalance({
    address: AIRDROP_ADDRESS,
    token: LUV_TOKEN_ADDRESS,
  });

  const { data: userBalance } = useBalance({
    address: address,
    token: LUV_TOKEN_ADDRESS,
  });

  // Real contract reads for airdrop data
  const { data: airdropStats } = useContractRead({
    address: AIRDROP_ADDRESS,
    abi: AIRDROP_ABI,
    functionName: 'getAirdropStats',
    args: [LUV_TOKEN_ADDRESS],
  });

  const { data: userClaimed } = useContractRead({
    address: AIRDROP_ADDRESS,
    abi: AIRDROP_ABI,
    functionName: 'hasUserClaimed',
    args: [LUV_TOKEN_ADDRESS, address],
  });

  // For now, use mock data with real contract address
  // Real contract data - using actual deployed contract
  const realAirdropStats = {
    airdropAmount: airdropStats ? airdropStats[0] : BigInt(0),
    totalClaimed: airdropStats ? airdropStats[1] : BigInt(0),
    totalRecipients: airdropStats ? airdropStats[2] : BigInt(0),
    contractBalance: airdropStats ? airdropStats[3] : (airdropBalance?.value || BigInt(0)),
    isActive: airdropStats ? airdropStats[4] : false
  };

  // Check if connected wallet is owner or funding account
  const isOwner = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase();
  const isFundingAccount = address?.toLowerCase() === FUNDING_ADDRESS.toLowerCase();
  const userHasClaimed = userClaimed || false;

  // Calculate airdrop status with intelligence
  const getAirdropStatus = (): AirdropStatus => {
    const contractBalance = airdropBalance?.value || BigInt(0);
    const airdropAmount = realAirdropStats.airdropAmount;
    
    // Check if contract has enough tokens for at least one airdrop
    if (contractBalance < airdropAmount) {
      return {
        isActive: false,
        hasEnded: true,
        reason: contractBalance === BigInt(0) ? "Airdrop has ended - No tokens remaining" : "Airdrop has ended - Insufficient tokens",
        remainingTokens: contractBalance
      };
    }
    
    return {
      isActive: realAirdropStats.isActive,
      hasEnded: false,
      remainingTokens: contractBalance
    };
  };

  const airdropStatus = getAirdropStatus();

  // Initialize empty transaction logs
  useEffect(() => {
    setTransactionLogs([]);
  }, []);

  // Handle transaction logs
  const addTransactionLog = (log: Omit<TransactionLog, 'id' | 'timestamp'>) => {
    const newLog: TransactionLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setTransactionLogs(prev => [newLog, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  // Handle claim function
  const handleClaim = () => {
    if (!isConnected) {
      setMessage("Please connect your wallet first");
      return;
    }
    if (userHasClaimed) {
      setMessage("You have already claimed your airdrop");
      return;
    }
    if (airdropStatus.hasEnded) {
      setMessage(airdropStatus.reason || "Airdrop has ended");
      return;
    }
    if (!airdropStatus.isActive) {
      setMessage("Airdrop is currently paused");
      return;
    }
    
    addTransactionLog({
      type: 'claim',
      status: 'pending',
      message: 'Claiming airdrop...',
      details: 'Transaction submitted to blockchain'
    });
    
    // Real contract call to claim airdrop
    claimAirdropContract({
      address: AIRDROP_ADDRESS,
      abi: AIRDROP_ABI,
      functionName: 'claimAirdropForToken',
      args: [LUV_TOKEN_ADDRESS],
    }, {
      onSuccess: (data: string) => {
        addTransactionLog({
          type: 'claim',
          status: 'success',
          message: 'Airdrop claimed successfully!',
          hash: data,
          details: `Received ${formatLargeNumber(realAirdropStats.airdropAmount)} LUV tokens`
        });
        setMessage("Airdrop claimed successfully!");
      },
      onError: (error: Error) => {
        addTransactionLog({
          type: 'claim',
          status: 'error',
          message: 'Claim failed',
          details: error.message
        });
        setMessage("Claim failed. Please try again.");
      }
    });
  };

  // Real contract write hooks for token operations
  const { writeContract: approveTokens, isPending: isApproving } = useContractWrite();
  const { writeContract: transferTokens, isPending: isTransferring } = useContractWrite();
  const { writeContract: claimAirdropContract, isPending: isClaiming } = useContractWrite();
  const { writeContract: withdrawTokens, isPending: isWithdrawing } = useContractWrite();
  const { writeContract: emergencyWithdraw, isPending: isEmergencyWithdrawing } = useContractWrite();

  // Handle funding transfer function
  const handleFundingTransfer = async () => {
    if (!isConnected) {
      setMessage("Please connect your wallet first");
      return;
    }
    if (!isFundingAccount) {
      setMessage("Only the funding account can transfer tokens to the contract");
      return;
    }
    if (!fundingAmount || parseFloat(fundingAmount) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }
    
    const amount = parseEther(fundingAmount);
    if (userBalance && amount > userBalance.value) {
      setMessage("Insufficient balance");
      return;
    }
    
    try {
      addTransactionLog({
        type: 'deposit',
        status: 'pending',
        message: 'Transferring tokens to airdrop contract...',
        details: `Sending ${fundingAmount} LUV tokens`
      });
      
      // First, approve the airdrop contract to spend tokens
      addTransactionLog({
        type: 'approval',
        status: 'pending',
        message: 'Approving token transfer...',
        details: `Approving ${fundingAmount} LUV tokens for airdrop contract`
      });
      
      // Request approval from user's wallet
      approveTokens({
        address: LUV_TOKEN_ADDRESS,
        abi: LUV_TOKEN_ABI,
        functionName: 'approve',
        args: [AIRDROP_ADDRESS, amount],
      }, {
        onSuccess: (data) => {
          addTransactionLog({
            type: 'approval',
            status: 'success',
            message: 'Token approval successful!',
            hash: data,
            details: `Approved ${fundingAmount} LUV tokens`
          });
          
          // Now transfer tokens to the airdrop contract
          transferTokens({
            address: LUV_TOKEN_ADDRESS,
            abi: LUV_TOKEN_ABI,
            functionName: 'transfer',
            args: [AIRDROP_ADDRESS, amount],
          }, {
            onSuccess: (data) => {
              addTransactionLog({
                type: 'deposit',
                status: 'success',
                message: 'Tokens transferred successfully!',
                hash: data,
                details: `Sent ${fundingAmount} LUV tokens to airdrop contract`
              });
              
              setMessage("Tokens transferred successfully!");
              setFundingAmount(""); // Clear input
            },
            onError: (error) => {
              addTransactionLog({
                type: 'deposit',
                status: 'error',
                message: 'Transfer failed',
                details: error.message
              });
              setMessage("Transfer failed. Please try again.");
            }
          });
        },
        onError: (error) => {
          addTransactionLog({
            type: 'approval',
            status: 'error',
            message: 'Approval failed',
            details: error.message
          });
          setMessage("Approval failed. Please try again.");
        }
      });
      
    } catch (error) {
      console.error('Transfer error:', error);
      addTransactionLog({
        type: 'deposit',
        status: 'error',
        message: 'Transfer failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setMessage("Transfer failed. Please try again.");
    }
  };

  // Handle owner withdrawal function
  const handleWithdrawTokens = () => {
    if (!isConnected || !isOwner) {
      setMessage("Only the owner can withdraw tokens");
      return;
    }
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }
    
    const amount = parseEther(withdrawAmount);
    
    addTransactionLog({
      type: 'withdraw',
      status: 'pending',
      message: 'Withdrawing tokens from airdrop contract...',
      details: `Withdrawing ${withdrawAmount} LUV tokens`
    });
    
    // Real contract call to withdraw tokens
    withdrawTokens({
      address: AIRDROP_ADDRESS,
      abi: AIRDROP_ABI,
      functionName: 'withdrawTokens',
      args: [LUV_TOKEN_ADDRESS, amount],
    }, {
      onSuccess: (data: string) => {
        addTransactionLog({
          type: 'withdraw',
          status: 'success',
          message: 'Tokens withdrawn successfully!',
          hash: data,
          details: `Withdrew ${withdrawAmount} LUV tokens from contract`
        });
        setMessage("Tokens withdrawn successfully!");
        setWithdrawAmount(""); // Clear input
      },
      onError: (error: Error) => {
        addTransactionLog({
          type: 'withdraw',
          status: 'error',
          message: 'Withdrawal failed',
          details: error.message
        });
        setMessage("Withdrawal failed. Please try again.");
      }
    });
  };

  // Handle emergency withdrawal function
  const handleEmergencyWithdraw = () => {
    if (!isConnected || !isOwner) {
      setMessage("Only the owner can perform emergency withdrawal");
      return;
    }
    
    addTransactionLog({
      type: 'emergency',
      status: 'pending',
      message: 'Emergency withdrawal in progress...',
      details: 'Withdrawing all tokens from airdrop contract'
    });
    
    // Real contract call for emergency withdrawal
    emergencyWithdraw({
      address: AIRDROP_ADDRESS,
      abi: AIRDROP_ABI,
      functionName: 'emergencyWithdraw',
      args: [LUV_TOKEN_ADDRESS],
    }, {
      onSuccess: (data: string) => {
        addTransactionLog({
          type: 'emergency',
          status: 'success',
          message: 'Emergency withdrawal successful!',
          hash: data,
          details: 'All tokens withdrawn from contract'
        });
        setMessage("Emergency withdrawal successful!");
      },
      onError: (error: Error) => {
        addTransactionLog({
          type: 'emergency',
          status: 'error',
          message: 'Emergency withdrawal failed',
          details: error.message
        });
        setMessage("Emergency withdrawal failed. Please try again.");
      }
    });
  };

  // Format large numbers
  const formatLargeNumber = (num: bigint | undefined) => {
    if (!num) return "0";
    const numStr = num.toString();
    const decimals = 18;
    
    if (numStr.length <= decimals) {
      return "0";
    }
    
    const integerPart = numStr.slice(0, -decimals);
    const length = integerPart.length;
    
    if (length > 15) {
      return `${integerPart.slice(0, -15)}Q`; // Quadrillion
    } else if (length > 12) {
      return `${integerPart.slice(0, -12)}T`; // Trillion
    } else if (length > 9) {
      return `${integerPart.slice(0, -9)}B`; // Billion
    } else if (length > 6) {
      return `${integerPart.slice(0, -6)}M`; // Million
    } else if (length > 3) {
      return `${integerPart.slice(0, -3)}K`; // Thousand
    }
    
    return integerPart;
  };

  // Format address
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">SHAMBA LUV Airdrop</h1>
          <p className="text-lg text-gray-300">Polygon Mainnet</p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 mb-6 border border-purple-500/30">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">Wallet Connection</h2>
              {isConnected ? (
                <div className="text-sm text-gray-300">
                  Connected: {formatAddress(address || "")}
                  {isOwner && <span className="ml-2 text-yellow-400">(Owner)</span>}
                  {isFundingAccount && <span className="ml-2 text-green-400">(Funding Account)</span>}
                </div>
              ) : (
                <div className="text-sm text-gray-300">Not connected</div>
              )}
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Connect Wallet
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setAdminMode(!adminMode)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    adminMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {adminMode ? 'User Mode' : 'Admin Mode'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contract Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400">
              {formatLargeNumber(realAirdropStats.airdropAmount)}
            </div>
            <div className="text-xs text-gray-400">Airdrop Amount</div>
          </div>
          
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">
              {realAirdropStats.totalRecipients.toString()}
            </div>
            <div className="text-xs text-gray-400">Total Recipients</div>
          </div>
          
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">
              {formatLargeNumber(realAirdropStats.totalClaimed)}
            </div>
            <div className="text-xs text-gray-400">Total Claimed</div>
          </div>
          
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">
              {formatLargeNumber(airdropStatus.remainingTokens)}
            </div>
            <div className="text-xs text-gray-400">Contract Balance</div>
          </div>
          
          <div className={`bg-black/20 backdrop-blur-lg rounded-xl p-4 border ${
            airdropStatus.hasEnded ? 'border-red-500/30' : 
            airdropStatus.isActive ? 'border-green-500/30' : 'border-yellow-500/30'
          }`}>
            <div className={`text-2xl font-bold ${
              airdropStatus.hasEnded ? 'text-red-400' : 
              airdropStatus.isActive ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {airdropStatus.hasEnded ? 'Ended' : airdropStatus.isActive ? 'Active' : 'Paused'}
            </div>
            <div className="text-xs text-gray-400">
              {airdropStatus.hasEnded ? airdropStatus.reason : 'Airdrop Status'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Interface */}
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-semibold mb-4">Claim Airdrop</h2>
            
            {isConnected ? (
              <div className="space-y-4">
                <div className="bg-black/10 rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-2">Your Balance</div>
                  <div className="text-lg font-semibold">
                    {userBalance ? formatLargeNumber(userBalance.value) : "0"} LUV
                  </div>
                </div>
                
                <div className="bg-black/10 rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-2">Claim Status</div>
                  <div className="text-lg font-semibold">
                    {userHasClaimed ? (
                      <span className="text-red-400">Already Claimed</span>
                    ) : (
                      <span className="text-green-400">Eligible to Claim</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-black/10 rounded-lg p-4">
                  <div className="text-sm text-gray-300 mb-2">Airdrop Status</div>
                  <div className="text-lg font-semibold">
                    {airdropStatus.hasEnded ? (
                      <span className="text-red-400">{airdropStatus.reason}</span>
                    ) : airdropStatus.isActive ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-yellow-400">Paused</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleClaim}
                  disabled={!isConnected || userHasClaimed || airdropStatus.hasEnded || !airdropStatus.isActive || isClaiming}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? 'Claiming...' : airdropStatus.hasEnded ? 'Airdrop Ended' : 'Claim Airdrop'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">Connect your wallet to claim your airdrop</div>
              </div>
            )}
          </div>

          {/* Admin Interface */}
          {adminMode && isOwner && (
            <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-500/30">
              <h2 className="text-xl font-semibold mb-4 text-yellow-400">Owner Admin Panel</h2>
              
              <div className="space-y-4">
                {/* Set Airdrop Amount */}
                <div className="bg-black/10 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Set Airdrop Amount</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Amount in LUV"
                      value={newAirdropAmount}
                      onChange={(e) => setNewAirdropAmount(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/20 rounded border border-gray-600 text-white placeholder-gray-400"
                    />
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                      Set
                    </button>
                  </div>
                </div>

                {/* Deposit Tokens */}
                <div className="bg-black/10 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Deposit Tokens</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Amount in LUV"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/20 rounded border border-gray-600 text-white placeholder-gray-400"
                    />
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors">
                      Deposit
                    </button>
                  </div>
                </div>

                {/* Withdraw Tokens */}
                <div className="bg-black/10 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Withdraw Tokens</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Amount in LUV"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/20 rounded border border-gray-600 text-white placeholder-gray-400"
                    />
                    <button 
                      onClick={handleWithdrawTokens}
                      disabled={isWithdrawing}
                      className={`px-4 py-2 rounded transition-colors ${
                        isWithdrawing ? 'bg-gray-600 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  </div>
                </div>

                {/* Emergency Withdraw */}
                <div className="bg-black/10 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-400">Emergency Withdraw</h3>
                  <button 
                    onClick={handleEmergencyWithdraw}
                    disabled={isEmergencyWithdrawing}
                    className={`w-full py-2 rounded transition-colors ${
                      isEmergencyWithdrawing ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isEmergencyWithdrawing ? 'Withdrawing...' : 'Withdraw All Tokens'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Funding Account Interface */}
          {isFundingAccount && (
            <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-green-500/30">
              <h2 className="text-xl font-semibold mb-4 text-green-400">Funding Account Panel</h2>
              
              <div className="space-y-4">
                {/* Send Tokens to Contract */}
                <div className="bg-black/10 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Send Tokens to Airdrop Contract</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Amount in LUV"
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/20 rounded border border-gray-600 text-white placeholder-gray-400"
                    />
                    <button 
                      onClick={() => handleFundingTransfer()}
                      disabled={isApproving || isTransferring}
                      className={`px-4 py-2 rounded transition-colors ${
                        isApproving || isTransferring 
                          ? 'bg-gray-600 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isApproving ? 'Approving...' : isTransferring ? 'Transferring...' : 'Send to Contract'}
                    </button>
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    This will transfer LUV tokens from your wallet to the airdrop contract
                  </div>
                  <div className="text-sm text-green-400 mt-2">
                    ✅ Live blockchain interaction - all transactions are real!
                  </div>
                </div>

                {/* Funding Account Balance */}
                <div className="bg-black/10 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Your LUV Balance</h3>
                  <div className="text-lg font-semibold">
                    {userBalance ? formatEther(userBalance.value) : "0"} LUV
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Logs */}
          <div className="lg:col-span-2 bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-gray-500/30">
            <h2 className="text-xl font-semibold mb-4">Transaction Logs</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transactionLogs.length === 0 ? (
                <div className="text-gray-400 text-center py-4">No transactions yet</div>
              ) : (
                transactionLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.status === 'success' ? 'bg-green-900/20 border-green-500/30' :
                      log.status === 'error' ? 'bg-red-900/20 border-red-500/30' :
                      'bg-blue-900/20 border-blue-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold">{log.message}</div>
                        {log.details && (
                          <div className="text-sm text-gray-300 mt-1">{log.details}</div>
                        )}
                        <div className="text-sm text-gray-400 mt-1">
                          {log.timestamp.toLocaleTimeString()} • {log.type.toUpperCase()}
                        </div>
                      </div>
                      {log.hash && (
                        <div className="flex flex-col items-end gap-1">
                          <a
                            href={`https://polygonscan.com/tx/${log.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                            </svg>
                            Polygonscan
                          </a>
                          <div className="text-xs text-gray-500 font-mono">
                            {log.hash.slice(0, 8)}...{log.hash.slice(-6)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className="mt-6 p-4 bg-black/20 backdrop-blur-lg rounded-xl border border-gray-500/30">
            <div className="text-center">{message}</div>
          </div>
        )}

        {/* Contract Info */}
        <div className="mt-6 p-4 bg-green-900/20 backdrop-blur-lg rounded-xl border border-green-500/30">
          <div className="text-center text-green-400">
            <strong>🚀 LIVE CONTRACT:</strong> ShambaLuvAirdrop.sol is live and fully functional on Polygon Mainnet
            <br />
            <span className="text-sm text-gray-400">Contract Address: {AIRDROP_ADDRESS}</span>
            <br />
            <span className="text-sm text-gray-400">LUV Token: {LUV_TOKEN_ADDRESS}</span>
            <br />
            <span className="text-sm text-yellow-400">All transactions are real and require wallet confirmation!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
