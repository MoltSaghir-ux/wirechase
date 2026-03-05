// WireChase shared TypeScript types

export type BrokerRole = 'admin' | 'loan_officer'
export type ClientStatus = 'pending' | 'in_progress' | 'complete' | 'archived'
export type DocStatus = 'missing' | 'uploaded' | 'approved' | 'rejected'

export interface Brokerage {
  id: string
  name: string
  nmls: string | null
}

export interface Broker {
  id: string
  full_name: string
  email: string
  role: BrokerRole
  brokerage_id: string | null
  created_at?: string
  brokerages?: Brokerage | null
}

export interface DocumentRequest {
  id: string
  label: string
  status: DocStatus
  required: boolean
  category: string | null
  notes: string | null
  client_id?: string
}

export interface Document {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  uploaded_at: string
  document_request_id: string
}

export interface Client {
  id: string
  full_name: string
  email: string
  status: ClientStatus
  invite_token: string
  created_at: string
  broker_id: string
  brokerage_id?: string
  deadline_at?: string | null
  notification_pending?: boolean
  notification_pending_since?: string | null
  document_requests?: DocumentRequest[]
}

export interface ActivityEntry {
  id: string
  event: string
  detail: string | null
  created_at: string
  client_id?: string
}

export interface TeamInvite {
  id: string
  email: string
  role: BrokerRole
  created_at: string
  accepted_at: string | null
  brokerage_id?: string
  token?: string
}
