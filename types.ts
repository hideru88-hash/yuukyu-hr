export interface ClientCompany {
  id: string;
  name: string;
  code?: string;
  postal_code?: string;
  address?: string;
  contact_person?: string;
  contact_title?: string;
  email?: string;
  phone?: string;
  fax?: string;
  work_type?: string;
  billing_type?: 'hourly' | 'daily' | 'monthly';
  contract_url?: string;
  status?: 'active' | 'suspended';
  created_at?: string;
}

export interface BillingRate {
  id: string;
  client_company_id: string;
  start_date: string;
  end_date?: string;
  rate: number;
  rate_type: 'hourly' | 'daily' | 'monthly';
  created_at?: string;
}

export interface SalaryRate {
  id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  rate: number;
  rate_type: 'hourly' | 'daily' | 'monthly';
  created_at?: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  leaveBalance: number;
  client_id?: string;
  client?: ClientCompany;
  employee_code?: string;
  phone?: string;
  postal_code?: string;
  address_line1?: string;
  address_line2?: string;
  employment_type?: string;
  is_team_lead?: boolean;
  birth_date?: string;
  gender?: string;
  source_company?: string;
  contract_end_date?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  passport_name?: string;
  nationality?: string;
  passport_number?: string;
  visa_status?: string;
  visa_expiry?: string;
  pension_number?: string;
  unemployment_number?: string;
  has_transport_allowance?: boolean;
  has_housing_allowance?: boolean;
  has_leadership_bonus?: boolean;
}

export interface LeaveRequest {
  id: string;
  type: 'Vacation' | 'Sick' | 'Personal';
  status: 'Approved' | 'Pending' | 'Rejected';
  startDate: string;
  endDate: string;
  days: number;
}

export interface CalendarEvent {
  day: number;
  type: 'Vacation' | 'Sick' | 'Remote';
}

export interface ChartData {
  name: string;
  value: number;
}