import { apiFetch } from "@/lib/api";

export async function acceptDriverAssignmentClient(assignmentId: string) {
  return apiFetch(`/driver/delivery/assignments/${assignmentId}/accept`, {
    method: "POST",
    body: "{}",
  });
}

export async function patchDriverAssignmentClient(
  assignmentId: string,
  body: {
    status: string;
    notes?: string;
    proofImageUrl?: string;
    failureReason?: string;
    failureNotes?: string;
    locationLat?: number;
    locationLng?: number;
  },
) {
  return apiFetch(`/driver/delivery/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
