/**
 * Baseline Postgres types for `public` tables used in Supabase-native slices.
 *
 * Regenerate when possible:
 *   npx supabase gen types typescript --project-ref <ref> --schema public > src/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoleTypeEnum =
  | "CUSTOMER"
  | "STORE_OWNER"
  | "DELIVERY_DRIVER"
  | "ADMIN"
  | "SUPER_ADMIN";

export type Database = {
  public: {
    Tables: {
      User: {
        Row: {
          id: string;
          email: string;
          hashedPassword: string | null;
          isEmailVerified: boolean;
          deletedAt: string | null;
          createdAt: string;
          updatedAt: string;
          requestedRole: RoleTypeEnum | null;
          onboardingStatus: string;
          auth_user_id: string | null;
        };
        Insert: {
          id: string;
          email: string;
          updatedAt: string;
          hashedPassword?: string | null;
          isEmailVerified?: boolean;
          deletedAt?: string | null;
          createdAt?: string;
          requestedRole?: RoleTypeEnum | null;
          onboardingStatus?: string;
          auth_user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["User"]["Row"]>;
        Relationships: [];
      };
      UserProfile: {
        Row: {
          id: string;
          userId: string;
          firstName: string;
          lastName: string;
          phone: string | null;
          avatarUrl: string | null;
          metadata: Json | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          firstName: string;
          lastName: string;
          updatedAt: string;
          phone?: string | null;
          avatarUrl?: string | null;
          metadata?: Json | null;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["UserProfile"]["Row"]>;
        Relationships: [];
      };
      Role: {
        Row: {
          id: string;
          name: RoleTypeEnum;
          description: string | null;
        };
        Insert: {
          id: string;
          name: RoleTypeEnum;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["Role"]["Row"]>;
        Relationships: [];
      };
      UserRoleAssignment: {
        Row: {
          id: string;
          userId: string;
          roleId: string;
          createdAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          roleId: string;
          createdAt?: string;
        };
        Update: Partial<Database["public"]["Tables"]["UserRoleAssignment"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
