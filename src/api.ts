
export type Car = {
  id: number;
  name: string;
  brand: string;
  model: string;
  year: number | null;
  price_per_day: string | number;
  transmission: string | null;
  fuel_type: string | null;
  seats: number | null;
  image_url: string | null;
  color?: string | null;
  plate_no?: string | null;
  category?: string | null;
  description: string | null;
  available: number | boolean;
};

type CarsResponse = {
  success: boolean;
  data: Car[];
};


async function readApiResponse(response: Response): Promise<any> {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error(`Server returned an unreadable response (HTTP ${response.status}). Check that the DrivEase backend is running and review its terminal for the actual error.`); }
}

function authHeaders(json = false): Record<string, string> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("drivease_token") : null;
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// Get all cars from MySQL
export async function getCars(): Promise<Car[]> {
  const response = await fetch("/api/cars");

  if (!response.ok) {
    throw new Error("Failed to fetch cars from DrivEase.");
  }

  const result: CarsResponse = await response.json();

  if (!result.success) {
    throw new Error("Could not load cars.");
  }

  return result.data;
}

// Save a booking to MySQL
export async function createBooking(booking: {
  car_id: number;
  renter_name: string;
  renter_email: string;
  renter_phone: string;
  pickup_location: string;
  return_location: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  payment_method?: string;
}) {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(booking),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to save booking.");
  }

  return result;
}

// Add a new car to MySQL
export async function createCar(car: {
  name: string;
  year: number;
  price_per_day: number;
  transmission: string;
  seats: number;
  image_url?: string;
  color?: string;
  plate_no?: string;
  category: string;
  available: boolean;
}) {
  const response = await fetch("/api/cars", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(car),
  });

  const result = await readApiResponse(response);

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Failed to add vehicle (HTTP ${response.status}).`);
  }

  return result;
}

// Upload a vehicle photo to Cloudinary
export async function uploadVehicleImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("images", file);
  const response = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: formData });
  const result = await readApiResponse(response);
  if (!response.ok || !result.success) throw new Error(result.message || "Failed to upload vehicle photo.");
  return result.image_urls?.[0] || result.image_url;
}

export async function uploadVehicleImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const response = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: formData });
  const result = await readApiResponse(response);
  if (!response.ok || !result.success) throw new Error(result.message || "Failed to upload vehicle photos.");
  return result.image_urls || (result.image_url ? [result.image_url] : []);
}


// Persist a vehicle's availability status in MySQL.
export async function updateCarAvailability(id: number, available: boolean) {
  const response = await fetch(`/api/cars/${id}/availability`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ available }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to update vehicle availability.");
  }

  return result;
}



export async function deleteCar(id: number) {
  const response = await fetch(`/api/cars/${id}`, { method: "DELETE", headers: authHeaders() });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Failed to delete vehicle.");
  return result;
}

export type DatabaseBooking = {
  id: number;
  car_id: number;
  renter_name: string;
  renter_email: string;
  renter_phone: string | null;
  pickup_location: string;
  return_location: string;
  pickup_date: string;
  return_date: string;
  total_price: string | number;
  status: "Pending" | "Accepted" | "Rejected" | "Completed" | "Cancelled";
  payment_status: "Paid" | "Unpaid" | "Due on pickup";
  payment_method: string | null;
  created_at: string;
  vehicle_name: string;
  vehicle_image: string | null;
  review_rating?: number | null;
  review_comment?: string | null;
  cancellation_reason?: string | null;
};

export async function getBookings(email?: string): Promise<DatabaseBooking[]> {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  const response = await fetch(`/api/bookings${query}`, { headers: authHeaders() });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch bookings.");
  }
  return result.data;
}

export async function updateBookingStatus(id: string | number, status: DatabaseBooking["status"]) {
  const response = await fetch(`/api/bookings/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ status }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Failed to update booking.");
  return result;
}

export async function updateBookingPayment(id: string | number, payment_status: DatabaseBooking["payment_status"]) {
  const response = await fetch(`/api/bookings/${id}/payment`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ payment_status }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Failed to update payment.");
  return result;
}


export type AccountUser = { id: number; full_name: string; email: string; role: "renter" | "owner"; phone?: string | null; address?: string | null; license_no?: string | null };
export type AuthResult = { success: boolean; token: string; user: AccountUser };

export async function registerAccount(input: { full_name: string; email: string; password: string; role: "renter" | "owner" }): Promise<AuthResult> {
  const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Could not create account.");
  return result;
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthResult> {
  const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Could not sign in.");
  return result;
}

export async function getProfile(token: string): Promise<AccountUser> {
  const response = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Could not load profile.");
  return result.data;
}

export async function saveProfile(token: string, input: { full_name: string; phone: string; address: string; license_no: string }): Promise<AccountUser> {
  const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Could not save profile.");
  return result.data;
}

export async function updateCar(id: number, car: { name: string; year: number; price_per_day: number; transmission: string; seats: number; image_url?: string; color?: string; plate_no?: string; category?: string }) {
  const response = await fetch(`/api/cars/${id}`, { method: "PATCH", headers: authHeaders(true), body: JSON.stringify(car) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Failed to update vehicle.");
  return result;
}

export async function submitBookingReview(id: string | number, rating: number, comment: string) {
  const response = await fetch(`/api/bookings/${encodeURIComponent(String(id))}/review`, { method: "PATCH", headers: authHeaders(true), body: JSON.stringify({ rating, comment }) });
  const result = await readApiResponse(response);
  if (!response.ok || !result.success) throw new Error(result.message || `Could not save review (HTTP ${response.status}).`);
  return result;
}

export async function cancelBooking(id: string | number, reason: string) {
  const response = await fetch(`/api/bookings/${id}/cancel`, { method: "PATCH", headers: authHeaders(true), body: JSON.stringify({ reason }) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Could not cancel booking.");
  return result;
}
