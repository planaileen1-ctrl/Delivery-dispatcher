export interface Pump {
  id: string;
  code: string;
  brand?: string;
  model?: string;
  status: "available" | "with_client" | "maintenance" | "with_driver";
  currentClientId?: string | null;
  currentDriverId?: string | null;
  pharmacyId: string;
  deliveredBy?: string;
  lastReview?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  pharmacyId: string;
}

export interface Order {
  id: string;
  orderCode: string;
  clientName: string;
  clientEmail: string;
  clientId: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: "ready" | "claimed" | "picked_up" | "delivered" | "cancelled";
  pumps: { pumpId: string; code: string }[];
  pharmacyId: string;
  createdAt: any;
  claimedBy?: string;
  destinationCity?: string;
  signaturePharmacy?: string;
  signatureDriverPickup?: string;
  signatureDriverDelivery?: string;
  signatureClient?: string;
  returnedPumpIds?: string[];
  failedReturns?: any[];
}

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: "driver" | "pharmacy_admin" | "pharmacy_staff" | "license_code";
  email: string;
  city?: string;
  state?: string;
  country?: string;
  pharmacyId?: string;
  signature?: string;
  code?: string;
  status?: string;
  assignedEmail?: string;
}
