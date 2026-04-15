export type DeliveryUiStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "PICKUP_ARRIVED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "NEAR_CUSTOMER"
  | "DELIVERED"
  | "FAILED";

const LINEAR: DeliveryUiStatus[] = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKUP_ARRIVED",
  "PICKED_UP",
  "ON_THE_WAY",
  "NEAR_CUSTOMER",
  "DELIVERED",
];

export function nextDeliveryActions(current: DeliveryUiStatus): DeliveryUiStatus[] {
  if (current === "FAILED" || current === "REJECTED" || current === "DELIVERED") return [];
  if (current === "ASSIGNED") return ["ACCEPTED", "REJECTED"];
  const i = LINEAR.indexOf(current);
  if (i < 0) return [];
  const next = LINEAR[i + 1];
  return next ? [next] : [];
}

export function canFailFrom(current: DeliveryUiStatus): boolean {
  return (
    current !== "DELIVERED" &&
    current !== "FAILED" &&
    current !== "REJECTED" &&
    current !== "ASSIGNED"
  );
}
