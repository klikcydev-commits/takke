export type UpdateApplicationStatusDto = {
  status: "APPROVED" | "REJECTED" | "INFO_REQUESTED";
  adminNotes?: string;
};
