export type StoreApplicationDocumentDto = {
  name: string;
  url: string;
  type: string;
};

export type StoreApplicationDto = {
  businessName: string;
  businessType: string;
  description?: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: string;
  city: string;
  state: string;
  country: string;
  logoUrl?: string;
  bannerUrl?: string;
  metadata?: unknown;
  documents?: StoreApplicationDocumentDto[];
};

export type DriverApplicationDto = {
  fullName: string;
  dateOfBirth?: string;
  vehicleType: string;
  vehicleModel: string;
  licensePlate: string;
  identityDocUrl: string;
  licenseDocUrl: string;
  insuranceDocUrl?: string;
  registrationDocUrl?: string;
  bankName?: string;
  accountNumber?: string;
};
