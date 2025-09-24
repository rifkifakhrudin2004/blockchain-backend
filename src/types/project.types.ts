export interface Project {
  id: number;
  project_id: string;
  name: string;
  description: string;
  total_tokens: number;
  available_tokens: number;
  token_price: number;
  initial_capital: number;
  admin_id: number;
  status: 'active' | 'completed' | 'cancelled';
}