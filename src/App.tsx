import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { createBooking, createCar, getCars, getBookings, submitBookingReview, cancelBooking, updateBookingStatus as saveBookingStatus, updateBookingPayment as saveBookingPayment, updateCarAvailability, deleteCar as removeCar, updateCar as saveCarChanges, uploadVehicleImages, registerAccount, loginAccount, getProfile, saveProfile, type Car, type DatabaseBooking } from "./api"

type Page = "login" | "home" | "bookings" | "profile" | "details" | "rental" | "review" | "dashboard" | "management" | "owner-bookings" | "owner-cars"

type BookingData = {
  fullName: string
  phone: string
  email: string
  pickupLocation: string
  returnLocation: string
  pickupDate: string
  returnDate: string
}

type VehicleData = {
  id: string
  name: string
  color: string
  plate: string
  year: string
  seats: string
  transmission: string
  category: string
  rate: string
  available: boolean
  image?: string
}

type RentalVehicle = {
  id: string
  databaseId?: number
  imageUrl?: string
  name: string
  price: number
  rating: string
  seats: string
  category: string
  crop: string
  detailCrop: string
  selectedCrop: string
  source?: string
  gallery: {
    src: string
    alt: string
    credit: string
    href: string
  }[]
}

type PaymentRecord = {
  id: string
  customer: string
  vehicle: string
  method: string
  amount: number
  detail: string
  createdAt: string
  status: "Paid" | "Due on pickup"
}

type RenterBooking = {
  id: string
  vehicleId: RentalVehicle["id"]
  vehicle: string
  customer: string
  pickupLocation: string
  returnLocation: string
  pickupDate: string
  returnDate: string
  amount: number
  paymentMethod: string
  createdAt: string
  status: "Pending" | "Accepted" | "Rejected" | "Completed" | "Cancelled"
  paymentStatus?: "Paid" | "Unpaid" | "Due on pickup"
  reviewRating?: number | null
  reviewComment?: string | null
  vehicleImage?: string | null
  cancellationReason?: string | null
}

type ProfileData = {
  fullName: string
  email: string
  phone: string
  address: string
  license: string
}

function vehicleImageList(value?: string | null): string[] {
  if (!value) return [];
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && item.length > 0); } catch {}
  return [value];
}

const rentalVehicles: RentalVehicle[] = []
const EMPTY_VEHICLE: RentalVehicle = {
  id: "", name: "No vehicle selected", price: 0, rating: "New", seats: "—",
  category: "Other", crop: "crop-home-vios", detailCrop: "crop-detail",
  selectedCrop: "crop-selected", gallery: [],
}

const BULACAN_LOCATIONS = [
  "Bulacan State University – Main Campus, Malolos",
  "Xentro Mall, Malolos",
  "Barasoain Church, Malolos",
  "Robinsons Place Malolos",
  "SM City Marilao",
  "WalterMart Calumpit",
  "Brgy. Iba Este, Calumpit",
  "Brgy. Poblacion, Calumpit",
  "Malolos City Hall",
  "Baliwag City Public Market",
  "Plaridel Municipal Hall",
  "Meycauayan City Hall",
]

const A = "/assets/"
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email.trim())

function Icon({ file, size = 18 }: { file: string; size?: number }) {
  return (
    <img
      aria-hidden="true"
      className="icon"
      src={`${A}${file}`}
      style={{ width: size, height: size }}
    />
  )
}

function Photo({
  source = "739f8.png",
  crop,
  className = "",
  imageUrl,
}: {
  source?: string
  crop: string
  className?: string
  imageUrl?: string
}) {
  return (
    <div className={`photo ${className}`}>
      <img
        alt=""
        className={imageUrl ? "" : crop}
        src={imageUrl || `${A}${source}`}
        style={
          imageUrl
            ? {
                position: "relative",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }
            : undefined
        }
      />
    </div>
  )
}

function Header({
  title,
  back,
  action,
}: {
  title: string
  back: () => void
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <button aria-label="Go back" className="icon-button plain" onClick={back}>
        <Icon file="287dd.svg" />
      </button>
      <h1>{title}</h1>
      {action}
    </header>
  )
}

function Field({
  label,
  value,
  icon,
  type = "text",
  onChange,
  required = false,
  placeholder,
  readOnly = false,
}: {
  label: string
  value: string
  icon?: string
  type?: "text" | "email" | "tel" | "date" | "datetime-local"
  onChange?: (value: string) => void
  required?: boolean
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        type={type}
        value={onChange ? value : undefined}
        defaultValue={onChange ? undefined : value}
      />
      {icon && <Icon file={icon} size={16} />}
    </label>
  )
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button className="primary" onClick={onClick}>
      {children}
    </button>
  )
}

function CustomerNav({ go, page }: { go: (page: Page) => void; page: Page }) {
  return (
    <nav className="bottom-nav customer-nav">
      <button
        className={page === "home" ? "active" : ""}
        onClick={() => go("home")}
      >
        <Icon file="f6b7b.svg" />
        <span>Home</span>
      </button>
      <button
        className={page === "bookings" ? "active" : ""}
        onClick={() => go("bookings")}
      >
        <Icon file="9df8b.svg" />
        <span>Bookings</span>
      </button>
      <button
        className={page === "profile" ? "active" : ""}
        onClick={() => go("profile")}
      >
        <Icon file="6618d.svg" />
        <span>Account</span>
      </button>
    </nav>
  )
}

function OwnerNav({
  page,
  go,
  logout,
}: {
  page: Page
  go: (page: Page) => void
  logout: () => void
}) {
  return (
    <nav className="bottom-nav owner-nav">
      <button
        className={page === "dashboard" ? "active" : ""}
        onClick={() => go("dashboard")}
      >
        <Icon file={page === "dashboard" ? "b88de.svg" : "350d1.svg"} />
        <span>Dashboard</span>
      </button>
      <button
        className={page === "owner-bookings" ? "active" : ""}
        onClick={() => go("owner-bookings")}
      >
        <Icon file="9df8b.svg" />
        <span>Bookings</span>
      </button>
      <button
        className={page === "owner-cars" ? "active" : ""}
        onClick={() => go("owner-cars")}
      >
        <Icon file={page === "owner-cars" ? "deb1e.svg" : "b9f0d.svg"} />
        <span>Cars</span>
      </button>
      <button onClick={logout}>
        <Icon file="f9345.svg" />
        <span>Log out</span>
      </button>
    </nav>
  )
}

function Login({
  onLogin,
}: {
  onLogin: (role: "renter" | "owner", email: string, token: string, fullName: string) => void
}) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [accountType, setAccountType] = useState<"renter" | "owner">("renter")

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Enter your email and password to continue.")
      return
    }
    if (!isValidEmail(email)) {
      setMessage("Enter a valid email address, such as name@example.com.")
      return
    }
    if (authMode === "signup" && !fullName.trim()) {
      setMessage("Enter your full name to create an account.")
      return
    }
    setBusy(true)
    setMessage("")
    try {
      const result = authMode === "signup"
        ? await registerAccount({ full_name: fullName.trim(), email: email.trim(), password, role: accountType })
        : await loginAccount({ email: email.trim(), password })
      onLogin(result.user.role, result.user.email, result.token, result.user.full_name)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to continue. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen login-screen">
      <Photo crop="crop-login" className="login-photo" />
      <section className="login-content">
        <p className="eyebrow">Good cars, yours to drive</p>
        <h1>
          DrivEase. Your
          <br />
          Companion on Road
        </h1>
        <div className="role-switcher" aria-label="Account type">
          <button
            className={accountType === "renter" ? "active" : ""}
            onClick={() => setAccountType("renter")}
          >
            Renter
          </button>
          <button
            className={accountType === "owner" ? "active" : ""}
            onClick={() => setAccountType("owner")}
          >
            Owner
          </button>
        </div>
        <div className="login-fields">
          {authMode === "signup" && <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Your full name" />}
          <Field
            label="Email address"
            value={email}
            icon="1b561.svg"
            type="email"
            onChange={setEmail}
            placeholder="you@example.com"
          />
          <label className="field">
            <span>Password</span>
            <input
              aria-label="Password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              type={passwordVisible ? "text" : "password"}
              value={password}
            />
            <button
              type="button"
              aria-label="Toggle password visibility"
              onClick={() => setPasswordVisible((v) => !v)}
            >
              <Icon file="f7e9e.svg" size={16} />
            </button>
          </label>
        </div>
        <button
          className="text-link forgot"
          onClick={() =>
            setMessage(
              email.trim()
                ? "Password resets are handled manually by the system owner. Please contact them for help."
                : "Type your email first.",
            )
          }
        >
          Forgot password?
        </button>
        {message && <p className="form-message">{message}</p>}
        <PrimaryButton onClick={submit}>
          {busy ? "Please wait..." : authMode === "login" ? "Log In" : "Create Account"}
        </PrimaryButton>
        <p className="signup">
          {authMode === "login"
            ? "New to DrivEase?"
            : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setAuthMode(authMode === "login" ? "signup" : "login")
              setMessage("")
            }}
          >
            {authMode === "login" ? "Create Account" : "Log In"}
          </button>
        </p>
      </section>
    </main>
  )
}

function VehicleCard({
  name,
  price,
  rating,
  seats,
  crop,
  imageUrl,
  go,
}: {
  name: string
  price: string
  rating: string
  seats: string
  crop: string
  imageUrl?: string
  go: () => void
}) {
  return (
    <button className="vehicle-card" onClick={go}>
      <Photo crop={crop} imageUrl={imageUrl} />
      <div className="vehicle-title">
        <strong>{name}</strong>
        <span>
          <Icon file="26e6d.svg" size={12} /> {rating}
        </span>
      </div>
      <div className="vehicle-meta">
        <span>
          <Icon file="6bf16.svg" size={12} /> {seats} seats · Automatic
        </span>
        <strong>
          {price}
          <small>/day</small>
        </strong>
      </div>
    </button>
  )
}

function Home({
  go,
  selectVehicle,
  databaseCars,
  bookings,
}: {
  go: (page: Page) => void
  selectVehicle: (vehicle: RentalVehicle) => void
  databaseCars: Car[]
  bookings: RenterBooking[]
}) {
  const [category, setCategory] = useState("All")
  const [query, setQuery] = useState("")
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const returnReminders = bookings.filter((item) => item.status === "Accepted").map((item) => {
    const due = new Date(`${item.returnDate.slice(0,10)}T00:00:00`)
    const today = new Date(); today.setHours(0,0,0,0)
    return { ...item, days: Math.ceil((due.getTime() - today.getTime()) / 86400000) }
  }).filter((item) => item.days <= 7)
  const displayVehicles: RentalVehicle[] = databaseCars
    .filter((car) => Boolean(Number(car.available)))
    .map((car) => ({
      id: `car-${car.id}`, databaseId: car.id, imageUrl: vehicleImageList(car.image_url)[0],
      name: car.name, price: Number(car.price_per_day), rating: "New",
      seats: String(car.seats ?? 4), category: car.category || "Other",
      crop: "crop-home-vios", detailCrop: "crop-detail", selectedCrop: "crop-selected",
      gallery: vehicleImageList(car.image_url).map((src, index) => ({ src, alt: `${car.name} photo ${index + 1}`, credit: "Vehicle owner", href: src })),
    }))
    .filter((vehicle) => (category === "All" || vehicle.category === category) && vehicle.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="screen has-nav">
      <section className="content home-content">
        <div className="brand-row">
          <h1>DrivEase</h1>
          <button
            className="icon-button"
            aria-expanded={notificationsOpen}
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Icon file="6de2e.svg" />
          </button>
        </div>
        {notificationsOpen && (
          <div className="notification-panel">
            <strong>Rental return reminders</strong>
            {returnReminders.length ? returnReminders.map((reminder) => (
              <p key={reminder.id}><b>{reminder.vehicle}</b><br />{reminder.days < 0 ? `Overdue by ${Math.abs(reminder.days)} day(s)` : reminder.days === 0 ? "Return is due today" : `Return in ${reminder.days} day(s)`} · {new Date(reminder.returnDate).toLocaleDateString()}</p>
            )) : <p>No upcoming return reminders. Accepted rentals will appear here.</p>}
            <button onClick={() => setNotificationsOpen(false)}>Close</button>
          </div>
        )}
        <p className="location">
          <Icon file="e1b1a.svg" size={12} /> Malolos, Bulacan
        </p>
        <h2>Find Your Perfect Ride</h2>
        <label className="search">
          <Icon file="dfa42.svg" size={16} />
          <input
            aria-label="Search cars"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a car or brand"
            value={query}
          />
          <Icon file="2cf46.svg" size={17} />
        </label>
        <div className="categories">
          {["All", "Sedan", "SUV", "MPV", "Motorcycle"].map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="section-heading">
          <h3>Available cars</h3>
          <button onClick={() => { setCategory("All"); setQuery("") }}>Clear search</button>
        </div>
        <div className="vehicle-list">
        
          {displayVehicles.length > 0 ? (
  displayVehicles.map((vehicle) => (
    <VehicleCard
      key={vehicle.id}
      crop={vehicle.crop}
      imageUrl={vehicle.imageUrl}
      go={() => {
        selectVehicle(vehicle)
        go("details")
      }}
      name={vehicle.name}
      price={`₱${vehicle.price.toLocaleString("en-PH")}`}
      rating={vehicle.rating}
      seats={vehicle.seats}
    />
  ))
) : (
  <div className="empty-state">
    <strong>{databaseCars.length === 0 ? "No vehicles available yet" : "No vehicles found"}</strong>
    <p>{databaseCars.length === 0 ? "The Owner has not added any vehicles yet. Please check back soon." : "Try another search or vehicle category."}</p>
    <button
      onClick={() => {
        setCategory("All")
        setQuery("")
      }}
    >
      Show all vehicles
    </button>
  </div>
)}
        </div>
      </section>
      <CustomerNav go={go} page="home" />
    </main>
  )
}

function ReviewForm({ bookingId, onSaved }: { bookingId: string; onSaved: () => void }) {
  const [rating, setRating] = useState(3)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return <form className="booking-review" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { await submitBookingReview(bookingId, rating, comment); onSaved() } catch (e) { setError(e instanceof Error ? e.message : "Could not save review.") } finally { setBusy(false) } }}>
    <strong>Rate your rental</strong>
    <div className="review-stars">{[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} star(s)`} className={value <= rating ? "selected" : ""} onClick={() => setRating(value)}>★</button>)}</div>
    <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={600} placeholder="Share a short comment about your rental" rows={2} />
    {error && <small className="form-message">{error}</small>}
    <button type="submit" disabled={busy}>{busy ? "Saving…" : "Submit review"}</button>
  </form>
}

function RenterBookings({
  bookings,
  go,
  onCancel,
}: {
  bookings: RenterBooking[]
  go: (page: Page) => void
  onCancel: (id: string, reason: string) => Promise<void>
}) {
  const [cancelTarget, setCancelTarget] = useState<RenterBooking | null>(null)
  const [cancelReason, setCancelReason] = useState("Found another option")
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const current = bookings.filter((item) => item.status === "Pending" || item.status === "Accepted")
  const previous = bookings.filter((item) => item.status === "Completed" || item.status === "Cancelled")

  const BookingItem = ({ item }: { item: RenterBooking }) => {
    const vehicle =
      rentalVehicles.find((entry) => entry.id === item.vehicleId) ??
      EMPTY_VEHICLE
    return (
      <article className="renter-booking-card">
        <Photo crop={vehicle.selectedCrop} imageUrl={item.vehicleImage} />
        <div className="renter-booking-copy">
          <div className="section-heading">
            <strong>{item.vehicle}</strong>
            <b className={`rental-status ${item.status.toLowerCase()}`}>
              {item.status}
            </b>
          </div>
          <span>
            {new Date(item.pickupDate).toLocaleDateString()} –{" "}
            {new Date(item.returnDate).toLocaleDateString()}
          </span>
          <small>
            {item.pickupLocation} → {item.returnLocation}
          </small>
          <div>
            <strong>₱{item.amount.toLocaleString()}</strong>
            <span>{item.paymentMethod}</span>
          </div>
          {item.status === "Pending" && <button className="cancel-rental-button" onClick={() => { setCancelTarget(item); setCancelReason("Found another option"); setCancelError("") }}>Cancel request</button>}
          {item.status === "Cancelled" && item.cancellationReason && <small>Cancellation reason: {item.cancellationReason}</small>}
          {item.status === "Completed" && (item.reviewRating ? (
            <div className="review-saved"><strong>{"★".repeat(item.reviewRating)}{"☆".repeat(5-item.reviewRating)} · Your review</strong><p>{item.reviewComment || "No written comment."}</p></div>
          ) : <ReviewForm bookingId={item.id} onSaved={() => window.location.reload()} />)}
        </div>
      </article>
    )
  }

  return (
    <main className="screen has-nav">
      <section className="content renter-page">
        <div className="brand-row">
          <div>
            <h1>My Bookings</h1>
            <p className="subtitle">
              Track the owner's decision and your rental history.
            </p>
          </div>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-state bookings-empty">
            <Icon file="9df8b.svg" size={28} />
            <strong>No bookings yet</strong>
            <p>Your pending and previous vehicle rentals will appear here.</p>
            <button onClick={() => go("home")}>
              Browse available vehicles
            </button>
          </div>
        ) : (
          <>
            <div className="section-heading renter-section-heading">
              <h3>Current requests</h3>
              <span>{current.length}</span>
            </div>
            {current.length ? (
              <div className="renter-booking-list">
                {current.map((item) => (
                  <BookingItem item={item} key={item.id} />
                ))}
              </div>
            ) : (
              <p className="inline-empty">No active rental requests.</p>
            )}
            <div className="section-heading renter-section-heading">
              <h3>Previous rentals</h3>
              <span>{previous.length}</span>
            </div>
            {previous.length ? (
              <div className="renter-booking-list">
                {previous.map((item) => (
                  <BookingItem item={item} key={item.id} />
                ))}
              </div>
            ) : (
              <p className="inline-empty">
                Completed rentals will be saved here.
              </p>
            )}
          </>
        )}
      </section>
      {cancelTarget && (
        <div className="modal-backdrop" role="presentation">
          <section className="owner-modal confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-rental-title">
            <h2 id="cancel-rental-title">Cancel this rental request?</h2>
            <p>Are you sure? You can cancel only while the owner has not accepted your request.</p>
            <label className="field cancel-reason-field"><span>Reason for cancellation</span>
              <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)}>
                <option>Found another option</option><option>Found a cheaper rental</option><option>Change of plans</option><option>Incorrect booking details</option><option>Other</option>
              </select>
            </label>
            {cancelError && <p className="form-message">{cancelError}</p>}
            <div className="logout-actions">
              <button disabled={cancelBusy} onClick={() => setCancelTarget(null)}>Keep request</button>
              <button disabled={cancelBusy} onClick={async () => { setCancelBusy(true); setCancelError(""); try { await onCancel(cancelTarget.id, cancelReason); setCancelTarget(null) } catch (error) { setCancelError(error instanceof Error ? error.message : "Could not cancel this request.") } finally { setCancelBusy(false) } }}>{cancelBusy ? "Cancelling…" : "Yes, cancel request"}</button>
            </div>
          </section>
        </div>
      )}
      <CustomerNav go={go} page="bookings" />
    </main>
  )
}

function RenterProfile({
  profile,
  setProfile,
  go,
  logout,
  token,
}: {
  profile: ProfileData
  setProfile: (profile: ProfileData) => void
  go: (page: Page) => void
  logout: () => void
  token: string
}) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const update = (key: keyof ProfileData) => (value: string) => {
    setSaved(false)
    setError("")
    setProfile({ ...profile, [key]: value })
  }
  const initials =
    profile.fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DR"

  return (
    <main className="screen has-nav">
      <section className="content renter-page profile-page">
        <h1>My Profile</h1>
        <p className="subtitle">
          Keep your renter information ready for future bookings.
        </p>
        <div className="profile-summary">
          <span className="profile-avatar">{initials}</span>
          <div>
            <strong>{profile.fullName || "Add your name"}</strong>
            <span>{profile.email || "Add your email"}</span>
          </div>
        </div>
        <h3>Basic information</h3>
        <div className="profile-fields">
          <Field
            label="Full name"
            onChange={update("fullName")}
            placeholder="Type your full name"
            value={profile.fullName}
          />
          <Field
            label="Email address"
            placeholder="Account email cannot be changed here"
            type="email"
            value={profile.email}
            readOnly
          />
          <Field
            label="Phone number"
            onChange={update("phone")}
            placeholder="Type your phone number"
            type="tel"
            value={profile.phone}
          />
          <Field
            label="Home address"
            onChange={update("address")}
            placeholder="Type your address"
            value={profile.address}
          />
          <Field
            label="Driver's license number"
            onChange={update("license")}
            placeholder="Type your license number"
            value={profile.license}
          />
        </div>
        {error && <p className="form-message">{error}</p>}
        {saved && <p className="profile-saved">Profile information saved.</p>}
        <PrimaryButton
          onClick={() => {
            if (!isValidEmail(profile.email)) {
              setError(
                "Enter a valid email address before saving your profile.",
              )
              setSaved(false)
              return
            }
            setError("")
            saveProfile(token, { full_name: profile.fullName, phone: profile.phone, address: profile.address, license_no: profile.license })
              .then((user) => { setProfile({ ...profile, fullName: user.full_name, email: user.email, phone: user.phone || "", address: user.address || "", license: user.license_no || "" }); setSaved(true) })
              .catch((saveError) => setError(saveError instanceof Error ? saveError.message : "Could not save profile."))
          }}
        >
          Save Profile
        </PrimaryButton>
        <button className="secondary-danger" onClick={logout}>
          Log out
        </button>
      </section>
      <CustomerNav go={go} page="profile" />
    </main>
  )
}

function Details({
  go,
  vehicle,
}: {
  go: (page: Page) => void
  vehicle: RentalVehicle
}) {
  const [favorite, setFavorite] = useState(false)
  const [message, setMessage] = useState("")
  const [photoIndex, setPhotoIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const activePhoto = vehicle.gallery[photoIndex]
  const showPhoto = (index: number) => {
    const count = vehicle.gallery.length
    setPhotoIndex((index + count) % count)
  }

  const book = () => {
    setMessage("")
    go("rental")
  }

  return (
    <main className="screen sticky-action">
      <section className="content details-content">
        <Header
          back={() => go("home")}
          title="Car details"
          action={
            <button
              aria-label={
                favorite ? "Remove from favorites" : "Add to favorites"
              }
              className={`header-dot favorite-button ${
                favorite ? "active" : ""
              }`}
              onClick={() => setFavorite((current) => !current)}
            >
              <Icon file="e53ce.svg" size={16} />
            </button>
          }
        />
        <div
          className="hero-photo-wrap gallery"
          onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
          onTouchEnd={(event) => {
            if (touchStart === null) return
            const distance = event.changedTouches[0].clientX - touchStart
            if (Math.abs(distance) > 45) {
              showPhoto(photoIndex + (distance < 0 ? 1 : -1))
            }
            setTouchStart(null)
          }}
        >
          <img
            alt={activePhoto.alt}
            className="gallery-photo"
            draggable={false}
            key={activePhoto.src}
            src={vehicle.imageUrl || activePhoto.src}
          />
          <button
            aria-label="Previous vehicle photo"
            className="gallery-arrow previous"
            onClick={() => showPhoto(photoIndex - 1)}
          >
            <Icon file="287dd.svg" size={18} />
          </button>
          <button
            aria-label="Next vehicle photo"
            className="gallery-arrow next"
            onClick={() => showPhoto(photoIndex + 1)}
          >
            <Icon file="287dd.svg" size={18} />
          </button>
          <span className="photo-count">
            {photoIndex + 1} / {vehicle.gallery.length}
          </span>
          <div className="gallery-dots" aria-label="Choose vehicle photo">
            {vehicle.gallery.map((photo, index) => (
              <button
                aria-label={`Show photo ${index + 1}`}
                className={index === photoIndex ? "active" : ""}
                key={photo.src}
                onClick={() => showPhoto(index)}
              />
            ))}
          </div>
          <a
            className="photo-credit"
            href={activePhoto.href}
            rel="noreferrer"
            target="_blank"
          >
            Photo by {activePhoto.credit} on Unsplash
          </a>
        </div>
        <div className="availability">
          <span>{vehicle.category.toUpperCase()} · 2023</span>
          <strong>Available</strong>
        </div>
        <div className="car-price">
          <h2>{vehicle.name}</h2>
          <p>
            <strong>₱{vehicle.price.toLocaleString()}</strong> <span>/day</span>
          </p>
        </div>
        <p className="rating">
          <Icon file="e53ce.svg" size={13} /> <strong>{vehicle.rating}</strong>{" "}
          <span>(12 reviews)</span>
        </p>
        <div className="features">
          <div>
            <Icon file="c7f1b.svg" />
            <span>Up to {vehicle.seats} passengers</span>
          </div>
          <div>
            <Icon file="02ce6.svg" />
            <span>Automatic</span>
          </div>
          <div>
            <Icon file="4a7b1.svg" />
            <span>{vehicle.id === "aerox" ? "Motorcycle" : "Gasoline"}</span>
          </div>
        </div>
        <h3>Made for your everyday</h3>
        <p className="body-copy">
          City drives, made effortless. A comfortable cabin, cool
          air-conditioning and reliable fuel economy.
        </p>
      </section>
      <div className="action-bar">
        <PrimaryButton onClick={book}>Book This Car</PrimaryButton>
      </div>
    </main>
  )
}

function Progress({ payment }: { payment?: boolean }) {
  return (
    <div className="progress">
      <strong className={!payment ? "active" : ""}>01 RENTAL DETAILS</strong>
      <i />
      <strong className={payment ? "active" : ""}>02 PAYMENT</strong>
    </div>
  )
}

function SelectedCar({
  review = false,
  vehicle,
}: {
  review?: boolean
  vehicle: RentalVehicle
}) {
  return (
    <div className={`selected-car ${review ? "review-car" : ""}`}>
      <Photo crop={vehicle.selectedCrop} source={vehicle.source} />
      <div>
        <strong>{vehicle.name}</strong>
        <span>
          ₱{vehicle.price.toLocaleString()} / day{review ? "" : " · Automatic"}
        </span>
        {review && <b>3-day rental</b>}
      </div>
    </div>
  )
}

function Rental({
  go,
  booking,
  setBooking,
  vehicle,
}: {
  go: (page: Page) => void
  booking: BookingData
  setBooking: (booking: BookingData) => void
  vehicle: RentalVehicle
}) {
  const [message, setMessage] = useState("")
  const update = (key: keyof BookingData) => (value: string) =>
    setBooking({ ...booking, [key]: value })
  const required = Object.values(booking).every((value) => value.trim())
  const dayCount =
    booking.pickupDate && booking.returnDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(booking.returnDate).getTime() -
              new Date(booking.pickupDate).getTime()) /
              86400000,
          ),
        )
      : 0
  const total = dayCount * vehicle.price

  const continueToReview = () => {
    if (!required || dayCount < 1) {
      setMessage("Complete every field and choose a valid rental period.")
      return
    }
    if (!isValidEmail(booking.email)) {
      setMessage("Enter a valid email address, such as name@example.com.")
      return
    }
    go("review")
  }

  return (
    <main className="screen sticky-action">
      <section className="content form-content">
        <Header back={() => go("details")} title="Rental information" />
        <Progress />
        <SelectedCar vehicle={vehicle} />
        <h3>Renter information</h3>
        <Field
          label="Full name"
          value={booking.fullName}
          onChange={update("fullName")}
          placeholder="Type your full name"
        />
        <div className="renter-row">
          <Field
            label="Phone number"
            value={booking.phone}
            type="tel"
            onChange={update("phone")}
            placeholder="Type your phone number"
          />
          <Field
            label="Email address"
            value={booking.email}
            type="email"
            onChange={update("email")}
            placeholder="Type your email"
          />
        </div>
        <h3>Pickup & return</h3>
        <label className="field location-field">
          <span>Pickup location · Bulacan</span>
          <select value={booking.pickupLocation} onChange={(event) => update("pickupLocation")(event.target.value)} required>
            <option value="">Choose pickup location</option>
            {BULACAN_LOCATIONS.map((location) => <option key={location}>{location}</option>)}
          </select>
        </label>
        <label className="field location-field">
          <span>Return location · Bulacan</span>
          <select value={booking.returnLocation} onChange={(event) => update("returnLocation")(event.target.value)} required>
            <option value="">Choose return location</option>
            {BULACAN_LOCATIONS.map((location) => <option key={location}>{location}</option>)}
          </select>
        </label>
        <div className="two-fields compact">
          <Field
            label="Pickup date & time"
            value={booking.pickupDate}
            type="datetime-local"
            onChange={update("pickupDate")}
          />
          <Field
            label="Return date & time"
            value={booking.returnDate}
            type="datetime-local"
            onChange={update("returnDate")}
          />
        </div>
        <div className="estimate">
          <span>Rental duration</span>
          <strong>
            {dayCount ? `${dayCount} day${dayCount === 1 ? "" : "s"}` : "—"}
          </strong>
          <b>Estimated total</b>
          <em>{dayCount ? `₱${total.toLocaleString()}` : "—"}</em>
          <small>
            {dayCount
              ? `₱${vehicle.price.toLocaleString()} × ${dayCount} days`
              : "Complete the dates to see a total"}
          </small>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
      <div className="action-bar">
        <PrimaryButton onClick={continueToReview}>
          Continue to Payment
        </PrimaryButton>
      </div>
    </main>
  )
}

function Review({
  go,
  booking,
  vehicle,
  onConfirm,
}: {
  go: (page: Page) => void
  booking: BookingData
  vehicle: RentalVehicle
  onConfirm: (payment: PaymentRecord, booking: RenterBooking) => void
}) {
  const [payment, setPayment] = useState("GCash")
  const [confirmed, setConfirmed] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState("")
  const dayCount = Math.max(
    1,
    Math.ceil(
      (new Date(booking.returnDate).getTime() -
        new Date(booking.pickupDate).getTime()) /
        86400000,
    ),
  )
  const total = dayCount * vehicle.price
  const formatDate = (value: string) =>
    value
      ? new Date(value).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—"
  return (
   <main className="screen sticky-action">
  <section className="content review-content">
    <Header back={() => go("rental")} title="Review Your Booking" />
    <Progress payment />

    <SelectedCar review vehicle={vehicle} />

    {paymentMessage && (
      <p style={{ color: "red" }}>{paymentMessage}</p>
    )}

    <div className="section-heading renter-heading">
      <h3>Renter information</h3>
      <button onClick={() => go("rental")}>Edit</button>
    </div>
        <strong className="person-name">{booking.fullName || "—"}</strong>
        <p className="muted">
          {booking.phone || "—"} · {booking.email || "—"}
        </p>
        <div className="journey">
          <div>
            <Icon file="67663.svg" size={15} />
            <p>
              <span>Pickup</span>
              {booking.pickupLocation || "—"}
            </p>
            <small>{formatDate(booking.pickupDate)}</small>
          </div>
          <div>
            <Icon file="7a1dd.svg" size={15} />
            <p>
              <span>Return</span>
              {booking.returnLocation || "—"}
            </p>
            <small>{formatDate(booking.returnDate)}</small>
          </div>
        </div>
        <h3>Price breakdown</h3>
        <div className="price-row muted">
          <span>
            ₱{vehicle.price.toLocaleString()} × {dayCount} rental days
          </span>
          <strong>₱{total.toLocaleString()}</strong>
        </div>
        <div className="price-row muted">
          <span>Booking fee</span>
          <strong>₱0</strong>
        </div>
        <div className="price-row total">
          <strong>Total amount</strong>
          <b>₱{total.toLocaleString()}</b>
        </div>
        <h3>Payment method</h3>
        <div className="payments">
          {[
            ["Cash", "63af4.svg"],
            ["GCash", "ad47b.svg"],
          ].map(([name, icon]) => (
            <button
              type="button"
              className={payment === name ? "active" : ""}
              key={name}
              onClick={() => setPayment(name)}
            >
              <Icon file={icon} size={14} />
              {name}
            </button>
          ))}
        </div>
        <div className="cash-note">
          <strong>{payment === "Cash" ? "Pay on pickup" : "GCash — manual payment"}</strong>
          <p>
            {payment === "Cash"
              ? "Your reservation will be submitted first. The owner will collect and record payment when the vehicle is released."
              : "Your reservation will be submitted first. The owner will provide payment instructions and manually confirm receipt. No GCash credentials or card details are collected by DrivEase."}
          </p>
        </div>
      </section>
      <div className="action-bar terms">
        <small>
          By confirming, you agree to the rental terms & conditions.
        </small>
        <PrimaryButton
          onClick={async () => {
            const detail = payment === "Cash" ? "Due on pickup" : "GCash — owner to confirm manually"


                  let savedBooking: { bookingId: number; reference: string }
                  try {
  savedBooking = await createBooking({
    car_id: vehicle.databaseId ?? Number(vehicle.id),
    renter_name: booking.fullName,
    renter_email: booking.email,
    renter_phone: booking.phone,
    pickup_location: booking.pickupLocation,
    return_location: booking.returnLocation,
    pickup_date: booking.pickupDate,
    return_date: booking.returnDate,
    total_price: total,
    payment_method: payment,
  })
} catch (error) {
  setPaymentMessage(
    error instanceof Error
      ? error.message
      : "Could not save your booking. Please try again.",
  )
  return
}
            const recordId = String(savedBooking.bookingId)
            const createdAt = new Date().toLocaleString()
            onConfirm(
              {
                id: recordId,
                customer: booking.fullName,
                vehicle: vehicle.name,
                method: payment,
                amount: total,
                detail,
                createdAt,
                status: "Due on pickup",
              },
              {
                id: recordId,
                vehicleId: vehicle.id,
                vehicle: vehicle.name,
                customer: booking.fullName,
                pickupLocation: booking.pickupLocation,
                returnLocation: booking.returnLocation,
                pickupDate: booking.pickupDate,
                returnDate: booking.returnDate,
                amount: total,
                paymentMethod: payment,
                createdAt,
                status: "Pending",
              },
            )
            setPaymentMessage("")
            setConfirmed(true)
          }}
        >
          Confirm Booking
        </PrimaryButton>
      </div>
      {confirmed && (
        <div className="modal-backdrop">
          <div className="owner-modal confirmation-modal booking-celebration">
            <div className="celebration-burst" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span><span>✧</span><span>✦</span></div>
            <div className="celebration-icon" aria-hidden="true">✓</div>
            <h2>Booking confirmed</h2>
            <p>
              Your {payment} booking has been recorded. You can review it from
              the Bookings tab.
            </p>
            <PrimaryButton onClick={() => go("home")}>
              Return Home
            </PrimaryButton>
          </div>
        </div>
      )}
    </main>
  )
}

function Metric({
  label,
  value,
  note,
  icon,
  onClick,
}: {
  label: string
  value: string
  note: string
  icon: string
  onClick?: () => void
}) {
  return (
    <button className="metric" onClick={onClick}>
      <span>{label}</span>
      <Icon file={icon} size={14} />
      <strong>{value}</strong>
      <small>{note}</small>
    </button>
  )
}

function exportBookingsReport(bookings: RenterBooking[]) {
  const exportedAt = new Date()
  const headers = ["Booking ID", "Request Created At", "Renter", "Vehicle", "Pickup Location", "Return Location", "Pickup Date", "Pickup Time", "Return Date", "Return Time", "Rental Days", "Amount (PHP)", "Payment Method", "Payment Status", "Booking Status", "Cancellation Reason", "Review Rating", "Review Comment"]
  const datePart = (value: string) => value ? value.slice(0, 10) : ""
  const timePart = (value: string) => value && value.length > 10 ? value.slice(11, 16) : ""
  const rows = bookings.map((b) => {
    const start = new Date(`${datePart(b.pickupDate)}T00:00:00`)
    const end = new Date(`${datePart(b.returnDate)}T00:00:00`)
    const rentalDays = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? "" : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    return [b.id,b.createdAt ? new Date(b.createdAt).toLocaleString() : "",b.customer,b.vehicle,b.pickupLocation,b.returnLocation,datePart(b.pickupDate),timePart(b.pickupDate),datePart(b.returnDate),timePart(b.returnDate),rentalDays,b.amount,b.paymentMethod,b.paymentStatus || "",b.status,b.cancellationReason || "",b.reviewRating || "",b.reviewComment || ""]
  })
  const paidRevenue = bookings.filter((b) => b.paymentStatus === "Paid" && !["Rejected", "Cancelled"].includes(b.status)).reduce((sum, b) => sum + b.amount, 0)
  const totalValue = bookings.filter((b) => !["Rejected", "Cancelled"].includes(b.status)).reduce((sum, b) => sum + b.amount, 0)
  const summary = [["DRIVEASE BOOKING & REVENUE REPORT"], ["Generated at", exportedAt.toLocaleString()], ["Total bookings", bookings.length], ["Active/completed booking value (PHP)", totalValue], ["Paid revenue (PHP)", paidRevenue], ["Pending requests", bookings.filter((b) => b.status === "Pending").length], ["Accepted requests", bookings.filter((b) => b.status === "Accepted").length], ["Rejected requests", bookings.filter((b) => b.status === "Rejected").length], ["Cancelled requests", bookings.filter((b) => b.status === "Cancelled").length], ["Completed rentals", bookings.filter((b) => b.status === "Completed").length], []]
  const csv = [...summary, headers, ...rows].map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob); const link = document.createElement("a")
  link.href = url; link.download = `DrivEase-Bookings-Report-${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
}

function Dashboard({
  go,
  payments,
  bookings,
  logout,
  cars,
}: {
  go: (page: Page) => void
  payments: PaymentRecord[]
  bookings: RenterBooking[]
  logout: () => void
  cars: Car[]
}) {
  const [period, setPeriod] = useState<"week" | "month">("week")
  const today = new Date()
  const paidPayments = bookings.filter((item) => item.paymentStatus === "Paid").map((item) => ({ amount: item.amount, createdAt: item.createdAt }))
  const totalRevenue = paidPayments.reduce((sum, item) => sum + item.amount, 0)
  const mondayOffset = (today.getDay() + 6) % 7
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(today.getDate() - mondayOffset)
  const weekPoints = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const revenue = paidPayments
      .filter(
        (item) =>
          new Date(item.createdAt).toDateString() === date.toDateString(),
      )
      .reduce((sum, item) => sum + item.amount, 0)
    return {
      label: date.toLocaleDateString([], { weekday: "short" }).slice(0, 1),
      revenue,
      active: date.toDateString() === today.toDateString(),
    }
  })
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate()
  const monthPoints = Array.from({ length: 5 }, (_, index) => {
    const start = index * 7 + 1
    const end = Math.min(start + 6, daysInMonth)
    const revenue = paidPayments
      .filter((item) => {
        const date = new Date(item.createdAt)
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() >= start &&
          date.getDate() <= end
        )
      })
      .reduce((sum, item) => sum + item.amount, 0)
    return {
      label: `${start}–${end}`,
      revenue,
      active: today.getDate() >= start && today.getDate() <= end,
    }
  })
  const chartPoints = period === "week" ? weekPoints : monthPoints
  const maxRevenue = Math.max(...chartPoints.map((point) => point.revenue), 1)
  const chartRange =
    period === "week"
      ? `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} – ${new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate() + 6,
        ).toLocaleDateString([], { month: "short", day: "numeric" })}`
      : today.toLocaleDateString([], { month: "long", year: "numeric" })
  return (
    <main className="screen has-nav">
      <section className="content dashboard-content">
        <h1 className="brand">DrivEase</h1>
        <h2>Owner Dashboard</h2>
        <p className="subtitle">Here's your overview</p>
        <button className="export-report-button" onClick={() => exportBookingsReport(bookings)}>↓ Generate Excel report</button>
        <div className="metrics">
          <Metric
            icon="5adea.svg"
            label="Total Bookings"
            note="This month"
            value={String(bookings.length)}
            onClick={() => go("owner-bookings")}
          />
          <Metric
            icon="21158.svg"
            label="Pending Bookings"
            note="To review"
            value={String(
              bookings.filter((item) => item.status === "Pending").length,
            ).padStart(2, "0")}
            onClick={() => go("owner-bookings")}
          />
          <Metric
            icon="ebd44.svg"
            label="Available Cars"
            note={`of ${cars.length} cars`}
            value={String(cars.filter((car) => Boolean(Number(car.available))).length).padStart(2, "0")}
            onClick={() => go("owner-cars")}
          />
          <Metric
            icon="1f7c7.svg"
            label="Revenue"
            note={today.toLocaleDateString([], {
              month: "short",
              year: "numeric",
            })}
            value={`₱${totalRevenue.toLocaleString()}`}
            onClick={() => setPeriod(period === "week" ? "month" : "week")}
          />
        </div>
        <div className="revenue-breakdown">
          <div><span>Collected payments</span><strong>₱{totalRevenue.toLocaleString()}</strong></div>
          <div><span>Awaiting payment</span><strong>₱{bookings.filter((item) => !["Rejected", "Cancelled"].includes(item.status) && item.paymentStatus !== "Paid").reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</strong></div>
          <div><span>Completed rentals</span><strong>{bookings.filter((item) => item.status === "Completed").length}</strong></div>
          <div><span>Pending requests</span><strong>{bookings.filter((item) => item.status === "Pending").length}</strong></div>
        </div>
        <button
          className="chart"
          onClick={() => setPeriod(period === "week" ? "month" : "week")}
        >
          <div className="section-heading">
            <h3>{period === "week" ? "Weekly" : "Monthly"} revenue</h3>
            <span>{chartRange}</span>
          </div>
          <div className="bars">
            {chartPoints.map((point, index) => (
              <div key={`${point.label}-${index}`}>
                <i
                  className={point.active ? "active" : ""}
                  style={{
                    height: point.revenue
                      ? Math.max(
                          8,
                          Math.round((point.revenue / maxRevenue) * 66),
                        )
                      : 4,
                  }}
                  title={`₱${point.revenue.toLocaleString()}`}
                />
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </button>
        <div className="section-heading">
          <h3>Recent bookings</h3>
          <button onClick={() => go("owner-bookings")}>View all</button>
        </div>
        {bookings.length ? bookings.slice(0, 2).map((item) => (
            <BookingRow
              car={item.vehicle}
              dates={`${new Date(item.pickupDate).toLocaleDateString()} – ${new Date(
                item.returnDate,
              ).toLocaleDateString()}`}
              initials={item.customer
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
              key={item.id}
              name={item.customer}
              price={`₱${item.amount.toLocaleString()}`}
              status={item.status}
            />
          )) : <p className="inline-empty">
            No renter bookings have been submitted yet.
          </p>}
        <div className="section-heading payment-heading">
          <h3>Payment activity</h3>
          <span>
            {payments.length} renter payment{payments.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="owner-payments">
          {payments.length === 0 ? (
            <div className="empty-state compact-empty">
              <strong>No renter payments yet</strong>
              <p>
                Confirmed renter payment details will appear here for the owner.
              </p>
            </div>
          ) : (
            payments.map((item) => (
              <div className="owner-payment-card" key={item.id}>
                <div>
                  <strong>{item.customer}</strong>
                  <span>
                    {item.vehicle} · {item.method}
                  </span>
                  <small>{item.detail}</small>
                </div>
                <div>
                  <b>₱{item.amount.toLocaleString()}</b>
                  <span className={item.status === "Paid" ? "paid" : "pending"}>
                    {item.status}
                  </span>
                  <small>{item.createdAt}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <OwnerNav go={go} logout={logout} page="dashboard" />
    </main>
  )
}

function BookingRow({
  initials,
  name,
  car,
  dates,
  price,
  status,
}: {
  initials: string
  name: string
  car: string
  dates: string
  price: string
  status: string
}) {
  return (
    <div className="booking-row">
      <span className="avatar">{initials}</span>
      <div>
        <strong>{name}</strong>
        <span>{car}</span>
        <small>{dates}</small>
      </div>
      <div className="booking-price">
        <span>{price}</span>
        <b className={status.toLowerCase()}>{status}</b>
      </div>
    </div>
  )
}

function Management({
  go,
  logout,
  renterBookings,
  onUpdateBooking,
  onPaymentUpdate,
  onCarAdded,
  databaseCars,
  mode,
}: {
  go: (page: Page) => void
  logout: () => void
  renterBookings: RenterBooking[]
  onUpdateBooking: (id: string, status: RenterBooking["status"]) => void
  onPaymentUpdate: () => Promise<void>
  onCarAdded: () => Promise<void>
  databaseCars: Car[]
  mode: "bookings" | "cars"
}) {

  const [bookingStatus, setBookingStatus] =
    useState<"Pending" | "Confirmed" | "Rejected">("Pending")
  const [bookingFilter, setBookingFilter] =
    useState<"All" | "Pending" | "Accepted" | "Rejected" | "Completed" | "Cancelled" | "Confirmed">(
      "All",
    )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)
  const [vehicleImage, setVehicleImage] = useState("")
  const [vehicleImageFile, setVehicleImageFile] = useState<File[]>([])

  const addVehicle = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);

  const vehicle: VehicleData = {
    id: crypto.randomUUID(),
    name: String(form.get("vehicle") || "").trim(),
    color: String(form.get("color") || "").trim(),
    plate: String(form.get("plate") || "").trim(),
    year: String(form.get("year") || "").trim(),
    seats: String(form.get("seats") || "").trim(),
    transmission: String(form.get("transmission") || "").trim(),
    category: String(form.get("category") || "Other").trim(),
    rate: String(form.get("rate") || "").trim(),
    available: form.get("available") === "on",
    image: vehicleImage || undefined,
  };

  if (
    Object.entries(vehicle).some(
      ([key, value]) => key !== "image" && !String(value).trim(),
    )
  ) {
    return;
  }

  try {
    const existingImages = vehicleImageList(editingCar?.image_url);
    const uploadedImages = vehicleImageFile.length ? await uploadVehicleImages(vehicleImageFile) : [];
    const imageUrls = [...existingImages, ...uploadedImages];
    if (!editingCar && !imageUrls.length) throw new Error("Please select at least one vehicle photo.");
    const imageUrl = imageUrls.length > 1 ? JSON.stringify(imageUrls) : (imageUrls[0] || "");

    const vehiclePayload = {
      name: vehicle.name,
      year: Number(vehicle.year),
      price_per_day: Number(vehicle.rate),
      transmission: vehicle.transmission,
      category: vehicle.category,
      seats: Number(vehicle.seats),
      image_url: imageUrl,
      color: vehicle.color,
      plate_no: vehicle.plate,
      available: vehicle.available,
    };
    if (editingCar) await saveCarChanges(editingCar.id, vehiclePayload);
    else await createCar({ ...vehiclePayload, image_url: imageUrl });

    await onCarAdded();

    setVehicleImage("");
    setVehicleImageFile([]);
    setAddingVehicle(false);
    setEditingCar(null);

    alert(editingCar ? "Vehicle updated successfully!" : "Vehicle successfully saved!");
  } catch (error) {
    console.error("Error saving vehicle:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Failed to save vehicle. Please try again.",
    );
  }
};

  return (
    <main className="screen has-nav">
      <section className="content management-content">
        <Header
          back={() => go("dashboard")}
          title={
            mode === "bookings" ? "Booking Management" : "Vehicle Management"
          }
          action={
            mode === "bookings" ? (
              <button
                aria-expanded={filtersOpen}
                aria-label="Filter management records"
                className="icon-button"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Icon file="02ce6.svg" />
              </button>
            ) : undefined
          }
        />
        {mode === "bookings" && (
          <>
            {filtersOpen && (
              <div className="management-filters">
                {([
                  "All",
                  "Pending",
                  "Accepted",
                  "Rejected",
                  "Completed",
                  "Cancelled",
                ] as const).map((filter) => (
                  <button
                    className={bookingFilter === filter ? "active" : ""}
                    key={filter}
                    onClick={() => {
                      setBookingFilter(filter)
                      setFiltersOpen(false)
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
            <div className="section-heading">
              <h3>Bookings</h3>
              <button onClick={() => setBookingFilter("All")}>
                {bookingFilter === "All" ? "View all" : bookingFilter} ·{" "}
                {
                  renterBookings.filter((item) => item.status === "Pending")
                    .length
                }{" "}
                pending
              </button>
            </div>
            {renterBookings
              .filter(
                (item) =>
                  bookingFilter === "All" || bookingFilter === item.status,
              )
              .map((item) => (
                <div className="booking-card renter-owner-card" key={item.id}>
                  <strong>{item.customer}</strong>
                  <b className={item.status.toLowerCase()}>{item.status}</b>
                  <span>{item.vehicle}</span>
                  <em>₱{item.amount.toLocaleString()}</em>
                  <small>
                    {new Date(item.pickupDate).toLocaleDateString()} –{" "}
                    {new Date(item.returnDate).toLocaleDateString()} ·{" "}
                    {item.paymentMethod}
                  </small>
                  {item.status === "Pending" && (
                    <div className="approval">
                      <button
                        onClick={() => onUpdateBooking(item.id, "Accepted")}
                      >
                        ✓ Accept rental
                      </button>
                      <button
                        onClick={() => onUpdateBooking(item.id, "Rejected")}
                      >
                        × Reject
                      </button>
                    </div>
                  )}
                  {item.status === "Accepted" && (
                    <button
                      className="complete-rental"
                      onClick={() => onUpdateBooking(item.id, "Completed")}
                    >
                      Mark rental completed
                    </button>
                  )}
                  {!(["Rejected", "Cancelled"].includes(item.status)) && item.paymentStatus !== "Paid" && (
                    <button className="complete-rental" onClick={async () => {
                      try { await saveBookingPayment(item.id, "Paid"); await onPaymentUpdate(); }
                      catch (error) { alert(error instanceof Error ? error.message : "Could not record payment."); }
                    }}>Mark payment received</button>
                  )}
                  {item.paymentStatus === "Paid" && !(["Rejected", "Cancelled"].includes(item.status)) && <small>Payment recorded: Paid</small>}
                </div>
              ))}
          </>
        )}
        {mode === "cars" && (
          <>
            <div className="section-heading vehicle-heading">
              <h3>Available Vehicles</h3>
              <button
                className="add-button"
                onClick={() => { setEditingCar(null); setVehicleImage(""); setVehicleImageFile([]); setAddingVehicle(true); }}
              >
                ＋ Add Vehicle
              </button>
            </div>
            {databaseCars.length > 0 ? (
              databaseCars.map((car) => (
                <ManagedCar
                  color={car.color || undefined}
                  crop="crop-yaris"
                  image={car.image_url || undefined}
                  initialAvailable={Boolean(Number(car.available))}
                  key={car.id}
                  name={car.name}
                  plate={car.plate_no || undefined}
                  rate={String(car.price_per_day)}
                  onDelete={async () => { await removeCar(car.id); await onCarAdded(); }}
                  onEdit={() => { setEditingCar(car); setVehicleImage(vehicleImageList(car.image_url)[0] || ""); setVehicleImageFile([]); setAddingVehicle(true); }}
                  onAvailabilityChange={async (available) => {
                    await updateCarAvailability(car.id, available);
                    await onCarAdded();
                  }}
                />
              ))
            ) : (
              <div className="empty-state">
                <strong>No vehicles in your inventory yet</strong>
                <p>Add your first vehicle to make it available in the catalog.</p>
              </div>
            )}
          </>
        )}
      </section>
      {addingVehicle && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setAddingVehicle(false)}
        >
          <form
            aria-label="Add vehicle"
            className="owner-modal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={addVehicle}
          >
            <div className="section-heading">
              <h2>{editingCar ? "Edit vehicle" : "Add a vehicle"}</h2>
              <button type="button" onClick={() => setAddingVehicle(false)}>
                Close
              </button>
            </div>
            <label className="upload-field">
              <span>Vehicle photo</span>
              <input
                accept="image/*"
                name="photo"
                multiple
                onChange={(event) => {
  const files = Array.from(event.target.files || []) as File[];
  if (files.length) { setVehicleImageFile(files); setVehicleImage(URL.createObjectURL(files[0])); }
}}
                required={!editingCar}
                type="file"
              />
              {vehicleImage ? (
                <img alt="Vehicle preview" src={vehicleImage} />
              ) : (
                <strong>Select one or more vehicle photos</strong>
              )}
            </label>
            <div className="owner-form-grid">
              <label>
                <span>Vehicle name and model</span>
                <input name="vehicle" defaultValue={editingCar?.name || ""} placeholder="e.g. Toyota Vios" required />
              </label>
              <label>
                <span>Color</span>
                <input name="color" defaultValue={editingCar?.color || ""} placeholder="e.g. Pearl white" required />
              </label>
              <label>
                <span>Plate number</span>
                <input name="plate" defaultValue={editingCar?.plate_no || ""} placeholder="e.g. ABC 1234" required />
              </label>
              <label>
                <span>Model year</span>
                <input
                  max="2030"
                  min="1990"
                  name="year"
                  placeholder="2026"
                  defaultValue={editingCar?.year || ""}
                  required
                  type="number"
                />
              </label>
              <label>
                <span>Seats</span>
                <input
                  max="20"
                  min="1"
                  name="seats"
                  placeholder="5"
                  defaultValue={editingCar?.seats || ""}
                  required
                  type="number"
                />
              </label>
              <label>
                <span>Transmission</span>
                <select defaultValue={editingCar?.transmission || ""} name="transmission" required>
                  <option disabled value="">
                    Select transmission
                  </option>
                  <option>Automatic</option>
                  <option>Manual</option>
                </select>
              </label>
              <label>
                <span>Vehicle category</span>
                <select defaultValue={editingCar?.category || "Sedan"} name="category" required>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="MPV">MPV</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span>Daily rental rate</span>
                <input
                  min="1"
                  name="rate"
                  placeholder="2500"
                  defaultValue={editingCar?.price_per_day || ""}
                  required
                  type="number"
                />
              </label>
              <label className="availability-check">
                <input defaultChecked={editingCar ? Boolean(Number(editingCar.available)) : true} name="available" type="checkbox" />
                <span>Available for rent now</span>
              </label>
            </div>
            <button className="primary" type="submit">
              {editingCar ? "Save Changes" : "Save Vehicle"}
            </button>
          </form>
        </div>
      )}
      <OwnerNav
        go={go}
        logout={logout}
        page={mode === "bookings" ? "owner-bookings" : "owner-cars"}
      />
    </main>
  )
}

function ManagedCar({
  name,
  crop,
  image,
  color,
  plate,
  rate = "1500",
  initialAvailable = true,
  onAvailabilityChange,
  onDelete,
  onEdit,
}: {
  name: string
  crop: string
  image?: string
  color?: string
  plate?: string
  rate?: string
  initialAvailable?: boolean
  onAvailabilityChange?: (available: boolean) => Promise<void>
  onDelete?: () => Promise<void>
  onEdit?: () => void
}) {
  const [available, setAvailable] = useState(initialAvailable)
  const [updating, setUpdating] = useState(false)
  return (
    <div className="managed-car">
      {image ? (
        <img alt={name} className="uploaded-vehicle" src={image} />
      ) : (
        <Photo crop={crop} source="96fea.png" />
      )}
      <div>
        <strong>{name}</strong>
        <span>
          ₱{Number(rate).toLocaleString()} / day
          {color && plate ? ` · ${color} · ${plate}` : ""}
        </span>
        <b className={available ? "" : "unavailable"}>
          ● {available ? "Available" : "Unavailable"}
        </b>
      </div>
      <button
        aria-label={`Toggle ${name} availability`}
        className="vehicle-menu"
        disabled={updating}
        onClick={async () => {
          const nextAvailability = !available;
          if (!onAvailabilityChange) {
            setAvailable(nextAvailability);
            return;
          }
          try {
            setUpdating(true);
            await onAvailabilityChange(nextAvailability);
            setAvailable(nextAvailability);
          } catch (error) {
            alert(error instanceof Error ? error.message : "Could not update vehicle availability.");
          } finally {
            setUpdating(false);
          }
        }}
      >
        <Icon file="aed0f.svg" size={14} />
      </button>
      <button className="vehicle-menu" aria-label={`Edit ${name}`} onClick={onEdit}>✎</button>
      <button className="vehicle-menu" aria-label={`Delete ${name}`} onClick={async () => {
        if (!window.confirm(`Delete ${name}? Vehicles with booking history cannot be deleted.`)) return;
        try { await onDelete?.(); } catch (error) { alert(error instanceof Error ? error.message : "Could not delete vehicle."); }
      }}>×</button>
    </div>
  )
}

function mapDatabaseBooking(item: DatabaseBooking): RenterBooking {
  return {
    id: String(item.id),
    vehicleId: String(item.car_id),
    vehicle: item.vehicle_name,
    customer: item.renter_name,
    pickupLocation: item.pickup_location,
    returnLocation: item.return_location,
    pickupDate: String(item.pickup_date).slice(0, 10),
    returnDate: String(item.return_date).slice(0, 10),
    amount: Number(item.total_price),
    paymentMethod: item.payment_method || item.payment_status,
    createdAt: item.created_at,
    status: item.status,
    paymentStatus: item.payment_status,
    reviewRating: item.review_rating ?? null,
    reviewComment: item.review_comment ?? null,
    vehicleImage: item.vehicle_image ?? null,
    cancellationReason: item.cancellation_reason ?? null,
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("login")
  const [role, setRole] = useState<"renter" | "owner" | null>(null)
  const [authToken, setAuthToken] = useState("")
  const [databaseCars, setDatabaseCars] = useState<Car[]>([])
  const refreshCars = async () => {
    const cars = await getCars();
    setDatabaseCars(cars);
    setCarsError("");
  };
  const refreshBookings = async (email?: string) => {
    const records = await getBookings(email);
    setRenterBookings(records.map(mapDatabaseBooking));
  };
  const [carsLoading, setCarsLoading] = useState(true)
  const [carsError, setCarsError] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle>(EMPTY_VEHICLE)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [renterBookings, setRenterBookings] = useState<RenterBooking[]>([])
  const [logoutPrompt, setLogoutPrompt] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    license: "",
  })
  const [booking, setBooking] = useState<BookingData>({
    fullName: "",
    phone: "",
    email: "",
    pickupLocation: "",
    returnLocation: "",
    pickupDate: "",
    returnDate: "",
  })
  const [device, setDevice] = useState<"phone" | "desktop">(() =>
    window.innerWidth < 700 ? "phone" : "desktop",
  )
  useEffect(() => {
  getCars()
    .then((cars) => {
      setDatabaseCars(cars)
      setCarsError("")
    })
    .catch((error) => {
      console.error("Failed to load cars:", error)
      setCarsError("Could not load cars from the database.")
    })
    .finally(() => setCarsLoading(false))
}, [])

  const go = (next: Page) => {
    if (
      (next === "dashboard" ||
        next === "management" ||
        next === "owner-bookings" ||
        next === "owner-cars") &&
      role !== "owner"
    ) {
      setPage("login")
      return
    }
    if (
      (next === "home" ||
        next === "bookings" ||
        next === "profile" ||
        next === "details" ||
        next === "rental" ||
        next === "review") &&
      role !== "renter"
    ) {
      setPage("login")
      return
    }
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const logout = () => {
    setLogoutPrompt(true)
  }
  const confirmLogout = () => {
    setLogoutPrompt(false)
    setRole(null)
    setAuthToken("")
    localStorage.removeItem("drivease_token")
    setPage("login")
  }

  let content: ReactNode = (
    <Login
      onLogin={(nextRole, email, token, fullName) => {
        setRole(nextRole)
        setAuthToken(token)
        localStorage.setItem("drivease_token", token)
        setProfile((current) => ({ ...current, fullName, email }))
        getProfile(token).then((user) => setProfile({ fullName: user.full_name, email: user.email, phone: user.phone || "", address: user.address || "", license: user.license_no || "" })).catch((error) => console.error("Could not load account profile:", error))
        if (nextRole === "renter") {
          refreshBookings(email).catch((error) => console.error("Could not load renter bookings:", error))
        } else {
          refreshBookings().catch((error) => console.error("Could not load owner bookings:", error))
        }
        setPage(nextRole === "owner" ? "dashboard" : "home")
      }}
    />
  )
  if (page === "home" && role === "renter") {
    content = (
  <Home
    go={go}
    selectVehicle={setSelectedVehicle}
    databaseCars={databaseCars}
    bookings={renterBookings}
  />
)
  }
  if (page === "bookings" && role === "renter") {
    content = <RenterBookings bookings={renterBookings} go={go} onCancel={async (id, reason) => { await cancelBooking(id, reason); await refreshBookings(); }} />
  }
  if (page === "profile" && role === "renter") {
    content = (
      <RenterProfile
        go={go}
        logout={logout}
        profile={profile}
        setProfile={setProfile}
        token={authToken}
      />
    )
  }
  if (page === "details" && role === "renter") {
    content = <Details go={go} vehicle={selectedVehicle} />
  }
  if (page === "rental" && role === "renter") {
    content = (
      <Rental
        booking={booking}
        go={go}
        setBooking={setBooking}
        vehicle={selectedVehicle}
      />
    )
  }
  if (page === "review" && role === "renter") {
    content = (
      <Review
        booking={booking}
        go={go}
        onConfirm={(payment, rentalBooking) => {
          setPayments((current) => [payment, ...current])
          setRenterBookings((current) => [rentalBooking, ...current])
          refreshBookings(booking.email).catch((error) => console.error("Could not refresh bookings:", error))
        }}
        vehicle={selectedVehicle}
      />
    )
  }
  if (page === "dashboard" && role === "owner") {
    content = (
      <Dashboard
        bookings={renterBookings}
        cars={databaseCars}
        go={go}
        logout={logout}
        payments={payments}
      />
    )
  }
  if (
    (page === "management" ||
      page === "owner-bookings" ||
      page === "owner-cars") &&
    role === "owner"
  ) {
    content = (
      <Management
        go={go}
        logout={logout}
        onCarAdded={refreshCars}
        onPaymentUpdate={() => refreshBookings()}
        databaseCars={databaseCars}
        mode={page === "owner-bookings" ? "bookings" : "cars"}
        onUpdateBooking={async (id, status) => {
          try {
            await saveBookingStatus(id, status)
            await refreshBookings()
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Could not update booking.")
          }
        }}
        renterBookings={renterBookings}
      />
    )
  }

  return (
    <div className={`app-shell layout-${device}`}>
      <div aria-label="Preview size" className="device-switcher">
        <button
          className={device === "phone" ? "active" : ""}
          onClick={() => setDevice("phone")}
        >
          <span className="phone-shape" /> Phone
        </button>
        <button
          className={device === "desktop" ? "active" : ""}
          onClick={() => setDevice("desktop")}
        >
          <span className="desktop-shape" /> Desktop
        </button>
      </div>
      {content}
      <button className="drivease-contact-button" onClick={() => setHelpOpen(true)} aria-label="Contact and help">Contact / Help</button>
      {helpOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Contact and help">
          <div className="owner-modal confirmation-modal help-modal">
            <h2>Need help?</h2>
            <p>For questions about a reservation, contact the vehicle owner using the contact details provided with your booking. For an urgent roadside or personal emergency, contact local emergency services first.</p>
            <div className="logout-actions"><button onClick={() => setHelpOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
      {logoutPrompt && (
        <div className="modal-backdrop">
          <div className="owner-modal confirmation-modal logout-modal">
            <h2>Log out of DrivEase?</h2>
            <p>
              Are you sure you want to log out? Your current session will end,
              but your booking and profile information will remain available
              when you return.
            </p>
            <div className="logout-actions">
              <button onClick={() => setLogoutPrompt(false)}>Cancel</button>
              <button onClick={confirmLogout}>Yes, log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
