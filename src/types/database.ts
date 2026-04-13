export type UserRole = 'admin' | 'controller' | 'owner'
export type ApprovalStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type StepStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          department: string | null
          employee_id: string | null
          initial_password: string | null
          phone: string | null
          full_name_en: string | null
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      activities: {
        Row: {
          id: string
          control_code: string
          title: string
          department: string | null
          owner_id: string | null
          controller_id: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
      evidence_records: {
        Row: {
          id: string
          activity_id: string
          owner_id: string
          status: ApprovalStatus
          notes: string | null
          file_path: string | null
          file_name: string | null
          current_approver_id: string | null
          submitted_at: string | null
          decided_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          owner_id: string
          status?: ApprovalStatus
          notes?: string | null
          file_path?: string | null
          file_name?: string | null
          current_approver_id?: string | null
          submitted_at?: string | null
          decided_at?: string | null
        }
        Update: {
          status?: ApprovalStatus
          notes?: string | null
          file_path?: string | null
          file_name?: string | null
          current_approver_id?: string | null
          submitted_at?: string | null
          decided_at?: string | null
        }
      }
      approval_steps: {
        Row: {
          id: string
          record_id: string
          step_order: number
          approver_id: string
          status: StepStatus
          comment: string | null
          decided_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          record_id: string
          step_order: number
          approver_id: string
          status?: StepStatus
          comment?: string | null
          decided_at?: string | null
        }
        Update: {
          status?: StepStatus
          comment?: string | null
          decided_at?: string | null
        }
      }
      approval_history: {
        Row: {
          id: string
          record_id: string
          approver_id: string
          action: string
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          record_id: string
          approver_id: string
          action: string
          comment?: string | null
        }
        Update: Partial<Database['public']['Tables']['approval_history']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string | null
          sender_id: string | null
          title: string
          body: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id?: string | null
          sender_id?: string | null
          title: string
          body?: string | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      approval_status: ApprovalStatus
      step_status: StepStatus
    }
  }
}
