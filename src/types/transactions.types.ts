export interface Transaction {
  id: number;
  transaction_id: string;
  from_user_id: number;
  to_user_id: number;
  project_id: string;
  token_amount: number;
  total_value: number;
  transaction_type: 'purchase' | 'transfer' | 'profit_distribution';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  blockchain_hash?: string;
}

export interface ProfitDistribution {
  id: number;
  project_id: string;
  total_profit: number;
  admin_share: number;
  user_share: number;
  profit_per_token: number;
  blockchain_hash?: string;
  status: 'pending' | 'completed';
}