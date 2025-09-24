import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ABI = [
  "constructor()",
  "event AgreementCreated(string,string,string,string,string,string,string,string,string,string,string,int256,uint256)",
  "event Approval(address indexed,address indexed,uint256)",
  "event ChartTokenCreated(string indexed,string,string,int256,uint256)",
  "event DividenProfitAdded(string,int256,int256,int256,int256)",
  "event DividenProfitUpdated(string,int256,int256,int256,int256)",
  "event HistoryTokenCreated(string indexed,string,int256,uint256)",
  "event TokenCreated(string indexed,string,string,int256)",
  "event TokenNominalReset(string indexed)",
  "event TokenUserUpdated(string indexed,string)",
  "event Transfer(address indexed,address indexed,uint256)",
  "function addChartToken(string,string,int256,int256) returns (string)",
  "function addDividenProfit(string,int256,int256,int256,int256)",
  "function addTransaction(string,string,string,string,string,int256,int256)",
  "function agreementCount() view returns (uint256)",
  "function agreements(uint256) view returns (string,string,string,string,string,string,string,string,string,string,string,int256,uint256)",
  "function allChartTokenIds(uint256) view returns (string)",
  "function allHistoryTokenIds(uint256) view returns (string)",
  "function allTokenIds(uint256) view returns (string)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function chartTokens(string) view returns (string,string,string,int256,uint256)",
  "function createAgreementLetter(string,string,string,string,string,string,string,string,string,string,string,int256)",
  "function createToken(string,string,int256)",
  "function decimals() view returns (uint8)",
  "function decreaseAllowance(address,uint256) returns (bool)",
  "function dividenProfit(string) view returns (string,int256,int256,int256,int256)",
  "function getAgreementByProjectId(string) view returns ((string,string,string,string,string,string,string,string,string,string,string,int256,uint256)[])",
  "function getAllAgreement() view returns ((string,string,string,string,string,string,string,string,string,string,string,int256,uint256)[])",
  "function getAllChartTokensByUserId(string) view returns ((string,string,string,int256,uint256)[])",
  "function getAllTokens() view returns ((string,string,string,int256)[])",
  "function getAllTransaction() view returns ((string,string,string,string,string,int256,int256)[])",
  "function getChartTokensByUserIdAndProjectId(string,string) view returns ((string,string,string,int256,uint256)[])",
  "function getDividenProfitByProjectId(string) view returns ((string,int256,int256,int256,int256))",
  "function getHistoryTokenByChartTokenId(string) view returns ((string,string,int256,uint256))",
  "function getHistoryTokensByUserIdAndProjectId(string,string) view returns ((string,string,int256,uint256)[])",
  "function getLatestChartTokenByUserIdAndProjectId(string,string) view returns ((string,string,string,int256,uint256))",
  "function getLatestChartTokensByProjectId(string) view returns ((string,string,string,int256,uint256)[])",
  "function getTokenById(string) view returns ((string,string,string,int256))",
  "function getTokenByProjectId(string) view returns ((string,string,string,int256)[])",
  "function getTokenByUserAndProject(string,string) view returns ((string,string,string,int256)[])",
  "function getTotalNominalToken(string,string) view returns (int256)",
  "function getTotalTokens() view returns (uint256)",
  "function getTransactionByProjectId(string) view returns ((string,string,string,string,string,int256,int256)[])",
  "function getTransactionByUserId(string) view returns ((string,string,string,string,string,int256,int256)[])",
  "function historyTokens(string) view returns (string,string,int256,uint256)",
  "function increaseAllowance(address,uint256) returns (bool)",
  "function name() view returns (string)",
  "function resetTokenNominal(string)",
  "function symbol() view returns (string)",
  "function tokenDetails(string) view returns (string,string,string,int256)",
  "function totalSupply() view returns (uint256)",
  "function transaksiList(uint256) view returns (string,string,string,string,string,int256,int256)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function updateDividenProfit(string,int256,int256,int256,int256)",
  "function updateTokenUser(string,string)"
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      CONTRACT_ABI,
      this.wallet
    );
  }

  // Add method to get current block number for connection testing
  async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Failed to get block number:', error);
      throw error;
    }
  }

  // Add method to check wallet balance
  async getWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  // Add method to get network information
  async getNetwork() {
    try {
      return await this.provider.getNetwork();
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  }

  async addTransaction(
    transactionId: string,
    fromUserId: string,
    toUserId: string,
    projectId: string,
    transactionType: string,
    tokenAmount: number,
    totalValue: number
  ) {
    try {
      const tx = await this.contract.addTransaction(
        transactionId,
        fromUserId,
        toUserId,
        projectId,
        transactionType,
        tokenAmount,
        totalValue
      );
      await tx.wait();
      return { success: true, hash: tx.hash };
    } catch (error) {
      console.error('Blockchain transaction error:', error);
      throw error;
    }
  }

  async addDividenProfit(
    projectId: string,
    totalProfit: number,
    adminShare: number,
    userShare: number,
    profitPerToken: number
  ) {
    try {
      const tx = await this.contract.addDividenProfit(
        projectId,
        totalProfit,
        adminShare,
        userShare,
        Math.floor(profitPerToken * 100000000) // Convert to integer
      );
      await tx.wait();
      return { success: true, hash: tx.hash };
    } catch (error) {
      console.error('Blockchain profit distribution error:', error);
      throw error;
    }
  }

  async createToken(tokenId: string, projectId: string, amount: number) {
    try {
      const tx = await this.contract.createToken(tokenId, projectId, amount);
      await tx.wait();
      return { success: true, hash: tx.hash };
    } catch (error) {
      console.error('Blockchain token creation error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const blockchainService = new BlockchainService();