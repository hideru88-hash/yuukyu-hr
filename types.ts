export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  leaveBalance: number;
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