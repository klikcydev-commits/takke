/** Session payload from GET /api/admin/me (admin-web). */
export type AdminMeResponse = {
  authUserId: string;
  userId: string;
  email: string;
  roles: string[];
  onboardingStatus: string;
  requestedRole: string | null;
  canAccessAdmin: boolean;
};
