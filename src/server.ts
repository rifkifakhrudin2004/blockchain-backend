import app from './app';
import { config } from  './config/environment';
import { blockchainService } from './config/blockchain';

const startServer = async () => {
  try {
    console.log('🔄 Starting server...');
    
    // Test blockchain connection
    console.log('📡 Testing blockchain connection...');
    const blockNumber = await blockchainService.getBlockNumber();
    console.log(`📦 Connected to blockchain. Current block: ${blockNumber}`);
    
    // Get additional blockchain info for debugging
    const network = await blockchainService.getNetwork();
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    try {
      const balance = await blockchainService.getWalletBalance();
      console.log(`💰 Wallet balance: ${balance} ETH`);
    } catch (error) {
      console.log('⚠️  Could not fetch wallet balance (this is normal for some networks)');
    }
    
    // Start server
    app.listen(config.port, () => {
      console.log('✅ Server started successfully!');
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Blockchain: ${config.providerUrl}`);
      console.log(`📝 Contract: ${config.contractAddress}`);
      console.log(`🌍 Server URL: http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        console.error('🔴 Network connection issue. Please check your PROVIDER_URL and internet connection.');
      } else if (error.message.includes('private key') || error.message.includes('wallet')) {
        console.error('🔴 Wallet configuration issue. Please check your PRIVATE_KEY in environment variables.');
      } else if (error.message.includes('contract')) {
        console.error('🔴 Contract issue. Please check your CONTRACT_ADDRESS in environment variables.');
      }
    }
    
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

startServer();