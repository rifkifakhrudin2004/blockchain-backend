export interface Token {
  id: number;
  token_id: string;
  project_id: string;
  user_id: number;
  amount: number;
  price_per_token: number;
  total_value: number;
  status: 'active' | 'sold' | 'transferred';
  blockchain_hash?: string;
}