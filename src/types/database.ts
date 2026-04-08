// Supabase DB 타입 정의 — Supabase 연결 후 자동 생성으로 교체 가능
export type UserRole = 'admin' | 'controller' | 'owner'
export type ApprovalStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          department: string | null
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
        Insert: Omit<Database['public']['Tables']['evidence_records']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['evidence_records']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      approval_status: ApprovalStatus
    }
  }
}
