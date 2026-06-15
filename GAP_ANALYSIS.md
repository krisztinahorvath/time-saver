# GAP ANALYSIS — TimeSaver Platform
**Date:** 2026-06-15  
**Branch:** `feature/task-management`  
**Reference:** Professional local-services marketplaces (SmallJobs.ro / Taskuri.ro pattern)

---

## 1. What Is Already Implemented and Working

### Backend
| Feature | Status |
|---|---|
| User registration with SHA-256 password hashing | ✅ |
| JWT authentication (HS256, 2h expiry) | ✅ |
| Role system: Admin / Employer / Worker | ✅ |
| GET/PUT `/api/Users/me` — profile read and edit | ✅ |
| GET `/api/Users/{id}/public-profile` with reviews | ✅ |
| Login returns `userId`, `name`, `userType`, `token` | ✅ |
| JobPost CRUD (create, read, delete) | ✅ |
| 16 job categories | ✅ |
| JobPost fields: title, description, budget, category, location, deadline, specialRequirements | ✅ |
| Job status workflow: Open → InProgress → Completed / Cancelled | ✅ |
| Application acceptance: auto-rejects others when one is accepted | ✅ |
| Duplicate application guard | ✅ |
| Review system: rating 1–5 + comment, one review per pair | ✅ |
| GET `/api/Users/{id}/reviews` returns average rating + list | ✅ |
| FluentValidation on all DTOs | ✅ |
| Newtonsoft `StringEnumConverter` — enums serialized as strings | ✅ |
| EF Core migration `MarketplaceUpgrade` (Deadline, SpecialRequirements) | ✅ |
| CORS configured for local development | ✅ |
| Swagger UI available | ✅ |

### Frontend
| Feature | Status |
|---|---|
| Public landing page with hero, categories, how-it-works | ✅ |
| Login / Register forms with AuthContext | ✅ |
| AuthContext with `isEmployer`, `isWorker`, `isAdmin` | ✅ |
| Protected routes (redirect to `/login` if unauthenticated) | ✅ |
| 401 interceptor auto-clears auth and redirects | ✅ |
| Role-based Navbar (Employer vs. Worker links) | ✅ |
| Role-based Dashboard (separate views per role) | ✅ |
| ExploreJobs with filters (keyword, category, location, budget, sort) | ✅ |
| JobDetails page (view, apply, accept, complete) | ✅ |
| PostJob form (all fields, validation messages) | ✅ |
| MyJobs — employer management (accept / complete / delete) | ✅ |
| MyApplications — worker view (grouped by status, withdraw) | ✅ |
| Profile — own profile with edit form + reviews received | ✅ |
| PublicProfile — public read-only profile with rating | ✅ |
| Global CSS design system (custom properties, badges, alerts, buttons) | ✅ |
| Romanian UI labels throughout | ✅ |
| Centralized TypeScript types aligned with backend enum strings | ✅ |

---

## 2. What Is Partially Implemented

| Feature | What Exists | What's Missing |
|---|---|---|
| **Image support** | `JobPostImage` model + DB table + `images` field in `JobPost` | No upload endpoint, no S3/blob storage, no UI for adding/viewing images |
| **Review UI** | Review endpoint exists on backend; "Lasă review" link in MyApplications | No actual review form component; link goes to a public profile, not a form |
| **Admin role** | `UserType.Admin` exists; `DELETE /api/Users/{id}` restricted to Admin | No admin dashboard UI, no ability to moderate jobs/reviews/users |
| **Job filtering** | Category, location, minPrice, maxPrice filters work on backend | No pagination — all records returned at once; no sort on backend |
| **Job status `Pending`** | Enum value exists | Never used — all jobs start as `Open`; `Pending` has no business logic |
| **`Cancelled` status** | Enum value exists | No endpoint to cancel a job; no UI button for cancellation |
| **Worker "accept" flow** | Employer can accept; job moves to InProgress | Worker has no way to decline an accepted job they no longer want |
| **Bio field** | Required for Workers at registration | Cannot be seen on the user's own profile card (only in edit form) |
| **`GET /api/Users`** | Returns all users (anonymized, no passwords) | No purpose served on the frontend — no UI that lists all users |

---

## 3. What Is Missing

### Core Marketplace Features
- **Direct messaging** between employer and worker (before/during job)
- **In-app notifications** (application received, application accepted, job completed)
- **Image upload** for job posts (to show what needs to be done)
- **Review creation UI** — actual form to submit a rating after a completed job
- **Job cancellation** — employer can cancel an Open or InProgress job
- **Password reset** / forgot-password flow
- **Email verification** on registration
- **Pagination** — all list endpoints return unbounded results
- **Worker portfolio** — ability to showcase past work or add a profile photo URL
- **Payment / escrow** — no payment flow; budget is decorative

### Discovery & Trust
- **Verified badge** for users (email verified, ID check, etc.)
- **User reporting** / flagging mechanism
- **Block user** functionality
- **Response-rate indicator** on public profiles
- **Availability calendar** for workers
- **Service area radius** — workers can specify which cities/areas they serve

### Operational
- **Admin panel** — view all users, jobs, flag content, resolve disputes
- **Dispute resolution** — mechanism to contest a completion or review
- **Soft deletes** — permanently deleting jobs/users can orphan related records
- **Audit log** — track who changed what and when
- **Rate limiting** — no protection against brute-force or API abuse
- **Refresh token** — JWT expires in 2h with no silent refresh

---

## 4. Backend Gaps

### Security
| Gap | Risk | Notes |
|---|---|---|
| SHA-256 without salt | High | Vulnerable to rainbow-table attacks. Should use BCrypt or Argon2 |
| No rate limiting on `/Login` | High | Brute-force attack possible |
| CORS allows any origin (`AllowAnyOrigin`) | Medium | Acceptable in dev, must be restricted in production |
| JWT with no refresh token | Medium | Users are logged out after 2h with no UX warning |
| No email verification | Medium | Anyone can register with a fake email |
| No input sanitization middleware | Low | FluentValidation helps, but no XSS/SQL-injection hardening layer |

### API Design
| Gap | Notes |
|---|---|
| No pagination | `GET /api/JobPosts`, `GET /api/Users`, `GET /api/Users/{id}/reviews` return all records |
| No cursor/offset params | Cannot implement infinite scroll or page controls without backend support |
| No `PATCH` for partial updates | `PUT /api/Users/me` replaces fields; requires all fields to be sent |
| `GET /api/Users` has no purpose | Not used in frontend; exposes user list with no filtering |
| No job cancellation endpoint | `PUT /api/JobPosts/{id}/cancel` is missing |
| No endpoint to reject a specific application | Only auto-rejected when another is accepted |
| No image upload endpoint | `POST /api/JobPosts/{id}/images` is missing |
| No endpoint to list all applications for a job | Embedded in `GET /api/JobPosts/{id}` — can't paginate applications separately |
| `PUT /api/JobPosts/{id}/accept` is ambiguous | Accepts an application (not a job) — naming should be `AcceptApplication` |
| Status transitions not validated server-side | Could theoretically mark a Cancelled job as Completed |

### Data Model
| Gap | Notes |
|---|---|
| No `UpdatedAt` timestamps | Cannot know when a job was last modified |
| No `completedAt` on JobPost | Cannot calculate time-to-completion |
| No `rejectionReason` on JobApplication | Workers don't know why they were rejected |
| No `Phone` field on User | Employers/workers must communicate only via message field in application |
| `JobPostImage.ImageUrl` is an unvalidated string | Any URL accepted; should validate format or use blob storage references |
| `JobPost.UserId` is not explicitly indexed | Could cause slow queries on `GET /api/JobPosts/mine` |
| No `ServiceArea` or `City` on User | Workers cannot indicate which locations they serve |
| Password stored as `string` (SHA-256 hex) | Column has no max-length constraint |

---

## 5. Frontend Gaps

### Missing Pages / Components
| Component | Notes |
|---|---|
| `ReviewForm` | No form to submit a review; "Lasă review" link goes to public profile instead |
| `Chat` / `Messages` | No messaging between employer and worker |
| `AdminDashboard` | No UI for the Admin role |
| `ForgotPassword` / `ResetPassword` | No password recovery flow |
| `NotFound` (404) | App silently redirects to home instead of showing a proper 404 page |
| `NotificationBell` | No real-time or polled notification system |
| `JobCancel` button | No way to cancel a job from UI |
| `ImageUpload` | No component for uploading job photos |

### State / UX Issues
| Gap | Notes |
|---|---|
| No pagination UI | ExploreJobs loads all jobs at once |
| No debounce on filter inputs | Each keystroke fires an API call |
| No error boundary | Any unhandled error crashes the whole page |
| `confirm()` used for withdrawing applications | Native browser dialog — inconsistent with the rest of the UI |
| No toast notification system | Inline `alert` divs that don't auto-dismiss |
| No loading skeletons | Only shows "Se încarcă..." text during fetches |
| No optimistic UI | Every action waits for a server round-trip before updating |
| Filters in ExploreJobs lost on back-navigation | URL query params not used — state lost on page leave |
| No empty-state illustrations | Plain text messages for empty lists |
| Hardcoded API base URL | `https://localhost:7051/api` in `axiosConfig.ts` — breaks in staging/production |
| No `.env` / environment config | No `VITE_API_URL` variable |

### Accessibility (a11y)
| Gap | Notes |
|---|---|
| No `aria-label` on icon-only buttons | Screen readers cannot interpret hamburger/close buttons |
| No focus management after modal/form close | Keyboard users lose focus context |
| Form errors not linked to inputs via `aria-describedby` | Screen readers won't associate error text with field |
| Color contrast not verified | Design system colors not checked against WCAG 2.1 AA |
| No skip-navigation link | Required for keyboard-only users |

---

## 6. UX / UI Gaps

| Area | Gap |
|---|---|
| **Onboarding** | No guided flow after registration; users land on an empty dashboard with no hints |
| **Trust signals** | No verified badge, response rate, completion rate, or member-since date on profiles |
| **Social proof** | Landing page has no real testimonials, stats, or example job listings |
| **Empty states** | Plain-text messages; no calls-to-action or illustrations |
| **Job card richness** | No category icon, no image thumbnail, no time-since-posted display |
| **Filter persistence** | Filters reset on page navigation |
| **Mobile experience** | Responsive but untested on real devices; some cards may overflow on narrow screens |
| **Application flow** | No confirmation screen after applying to a job |
| **Status clarity** | Workers see job `status` badge but no explanation of what each status means for them |
| **Review prompt** | No automatic nudge to leave a review after job completion |
| **Deadline display** | Deadline shown as ISO date string, not human-readable (e.g., "în 3 zile") |
| **Budget display** | No currency formatting (e.g., `1500` → `1.500 RON`) |
| **Rejected applications** | Workers see "Respins" but have no context or message |

---

## 7. Security and Validation Gaps

### Backend
| Issue | Severity | Fix |
|---|---|---|
| SHA-256 password hashing without salt | Critical | Replace with BCrypt / Argon2 (breaking change — requires migration) |
| No login rate limiting | High | Add IP-based throttling (e.g., `AspNetCoreRateLimit`) |
| CORS is wide open (`AllowAnyOrigin`) | Medium | Restrict to known origins in production |
| No JWT refresh token | Medium | Add `RefreshToken` model + `/api/auth/refresh` endpoint |
| No email verification | Medium | Send confirmation link on register; block login until verified |
| `DELETE /api/Users/{id}` has no cascade audit | Low | Log deletion; add soft-delete instead |
| Status transitions not validated server-side | Low | Enforce state machine in service layer |
| No anti-CSRF (not needed for JWT-only, but document it) | Info | Confirm app doesn't use cookies for auth |

### Frontend
| Issue | Severity | Fix |
|---|---|---|
| Token stored in `localStorage` (XSS risk) | Medium | Consider httpOnly cookie alternative; at minimum add CSP headers |
| No input sanitization before display | Low | React escapes by default, but `dangerouslySetInnerHTML` must be avoided |
| API URL hardcoded | Low | Use `import.meta.env.VITE_API_URL` |
| No HTTPS enforcement check | Low | Add redirect in production |

### Validation
| Gap | Notes |
|---|---|
| No max-budget validation | A job can be posted with a budget of 999,999,999 |
| No min-title length | A 1-character title passes validation |
| `message` field in `CreateJobApplicationDto` has no validator | No min/max length enforced |
| `Bio` on `UpdateUserDto` has no max-length | Unlimited text accepted |
| Email uniqueness only checked in controller (not at DB level) | Race condition possible; add unique index to `Users.Email` |

---

## 8. Database / Model Gaps

| Gap | Impact | Recommended Fix |
|---|---|---|
| No unique index on `Users.Email` | Duplicate accounts possible in race condition | `HasIndex(u => u.Email).IsUnique()` in `OnModelCreating` |
| No `UpdatedAt` on `JobPost` | Cannot order by "recently updated" | Add nullable `DateTime? UpdatedAt` |
| No `CompletedAt` on `JobPost` | Cannot measure time-to-completion | Add nullable `DateTime? CompletedAt` |
| No `RejectionReason` on `JobApplication` | Workers have no feedback | Add nullable `string? RejectionReason` |
| `JobPost.Pending` status is unused | Dead enum value causes confusion | Remove or define business flow that uses it |
| No `Phone` on `User` | Contact info limited to email only | Add optional `string? Phone` |
| No indexes on foreign keys | N+1 query risk on joins | Add EF Core indexes for `JobPost.UserId`, `JobApplication.JobPostId`, `Review.ReviewedUserId` |
| `JobPostImage` has no size/type constraint | Any URL stored | Add `FileType` and `FileSizeMb` columns; validate on upload |
| No soft delete | Hard deletes orphan data | Add `IsDeleted bool` / `DeletedAt DateTime?` to `JobPost` and `User` |
| No `ServiceArea` / `OperatingCities` on `User` | Workers can't declare where they work | Add `string? ServiceArea` or a junction table |
| `Review` has no `JobPostId` FK | Cannot confirm the two parties worked together in controller reliably | Confirm `ReviewsController` enforces job-relationship check (currently it does, but schema lacks FK) |
| Password column has no length constraint | Unlimited varchar | Add `[MaxLength(256)]` |

---

## 9. Testing Checklist

### Authentication Flow
- [ ] Register as Employer → success message
- [ ] Register as Worker → success message
- [ ] Register with duplicate email → clear error message
- [ ] Register with weak password → validation error
- [ ] Login with correct credentials → redirected to `/dashboard`; navbar shows name and role
- [ ] Login with wrong password → error message displayed
- [ ] Refresh page after login → remain authenticated (AuthContext loads from localStorage)
- [ ] Navigate to `/dashboard` when not logged in → redirected to `/login`
- [ ] Wait for JWT expiry (2h) or manually clear `localStorage` → redirected to `/login`

### Employer Workflow
- [ ] Post job with all fields → appears in "Joburile mele"
- [ ] Post job missing required field → validation error displayed
- [ ] Post job with past deadline → validation error from backend
- [ ] View job details → application list visible
- [ ] Accept a specific application → other applications become "Rejected"; job status → InProgress
- [ ] Accept application twice → no duplicate state change
- [ ] Mark job Completed → badge updates; job disappears from ExploreJobs
- [ ] Delete an Open job → removed from list
- [ ] Attempt to delete an InProgress job → rejected (should show error)

### Worker Workflow
- [ ] Browse ExploreJobs → only Open jobs visible
- [ ] Filter by category → only matching jobs shown
- [ ] Filter by budget → results within range
- [ ] Apply to a job with message → button changes to "Ai aplicat deja"
- [ ] Apply to the same job again → duplicate error shown
- [ ] Apply to own job (as Employer) → should be rejected (backend doesn't enforce this currently — **known gap**)
- [ ] View "Aplicațiile mele" → application appears under "În așteptare"
- [ ] Withdraw pending application → removed from list
- [ ] After employer accepts: application badge → "Acceptat"
- [ ] After job completed: "Lasă review" link appears

### Review Flow
- [ ] Worker tries to review employer before job is complete → backend rejects (409)
- [ ] Worker submits review (via Swagger, no UI yet) → rating saved
- [ ] Review appears on employer's public profile
- [ ] Same user tries to review again → backend rejects duplicate

### Profile
- [ ] Own profile shows correct name, bio, rating
- [ ] Edit name/bio → saved; navbar updates with new name
- [ ] View another user's public profile via `/users/:id/profile` → read-only with rating
- [ ] Rating shows "0.0 (0 recenzii)" when no reviews exist

### Navbar & Routing
- [ ] Employer navbar: Dashboard, Explorează, Postează Job, Joburile mele, Profilul meu
- [ ] Worker navbar: Dashboard, Explorează, Aplicațiile mele, Profilul meu
- [ ] Logout → clears localStorage; redirected to `/` (landing page)
- [ ] Hamburger menu on mobile → links appear/collapse correctly

### Error & Edge Cases
- [ ] API server down → shows error message, does not crash
- [ ] Invalid job ID in URL (`/jobs/99999`) → handled gracefully (404 state)
- [ ] Invalid user ID in URL → PublicProfile shows "Profil negăsit"
- [ ] Network slow → loading text shown
- [ ] Form submitted twice quickly → no duplicate POST (button should be disabled on submit)

---

## 10. Priority Roadmap — Next 5 Development Phases

---

### Phase 1 — Stability & Critical Fixes (Immediate)
*Goal: Make the existing features production-safe and bug-free.*

| # | Task | Area |
|---|---|---|
| 1.1 | Replace SHA-256 with BCrypt password hashing (data migration required) | Backend |
| 1.2 | Add unique index on `Users.Email` in DB | Backend |
| 1.3 | Add `VITE_API_URL` environment variable; remove hardcoded localhost | Frontend |
| 1.4 | Add login rate-limiting middleware | Backend |
| 1.5 | Enforce status-transition rules server-side (state machine) | Backend |
| 1.6 | Add `PUT /api/JobPosts/{id}/cancel` endpoint | Backend |
| 1.7 | Add Cancel button to MyJobs / JobDetails UI | Frontend |
| 1.8 | Add validator for `CreateJobApplicationDto.Message` (min 10, max 500) | Backend |
| 1.9 | Replace `confirm()` dialogs with custom modal component | Frontend |
| 1.10 | Add proper 404 Not Found page | Frontend |

---

### Phase 2 — Review UI + Messaging Foundation
*Goal: Complete the review creation workflow and add direct employer-worker chat.*

| # | Task | Area |
|---|---|---|
| 2.1 | Create `ReviewForm` component (rating stars + comment textarea) | Frontend |
| 2.2 | Wire "Lasă review" link to the new form instead of public profile | Frontend |
| 2.3 | Add review submission success state with redirect | Frontend |
| 2.4 | Create `Message` model: `Id, SenderId, ReceiverId, JobPostId, Content, SentAt, IsRead` | Backend |
| 2.5 | Create `MessagesController`: `GET /conversations`, `GET /job/{id}/messages`, `POST /messages` | Backend |
| 2.6 | Create `Chat.tsx` component: conversation list + message thread | Frontend |
| 2.7 | Add "Contactează" button on JobDetails and PublicProfile | Frontend |
| 2.8 | Add unread message count badge to Navbar | Frontend |

---

### Phase 3 — Discovery, Trust & Profiles
*Goal: Help employers find trustworthy workers; help workers stand out.*

| # | Task | Area |
|---|---|---|
| 3.1 | Add pagination to `GET /api/JobPosts` (cursor or offset-based) | Backend |
| 3.2 | Add pagination UI in ExploreJobs (Load More or page numbers) | Frontend |
| 3.3 | Add debounce (300ms) to filter inputs in ExploreJobs | Frontend |
| 3.4 | Persist filters to URL query params (`?category=Cleaning&location=Cluj`) | Frontend |
| 3.5 | Add `completedJobsCount` to public profile response | Backend |
| 3.6 | Add `memberSince` to public profile response | Backend |
| 3.7 | Add `Phone` (optional) to User model and registration form | Backend + Frontend |
| 3.8 | Add `ServiceArea` field to Worker profile (free-text for now) | Backend + Frontend |
| 3.9 | Add sort by rating / most active to worker discovery | Backend |
| 3.10 | Add `verified` flag (manual admin toggle) + badge on profiles | Backend + Frontend |

---

### Phase 4 — Image Upload + Notifications
*Goal: Richer job listings and real-time awareness.*

| # | Task | Area |
|---|---|---|
| 4.1 | Add `POST /api/JobPosts/{id}/images` endpoint (accept multipart) | Backend |
| 4.2 | Store images on local disk (`wwwroot/uploads`) with GUID filenames | Backend |
| 4.3 | Serve static files via `UseStaticFiles()` | Backend |
| 4.4 | Add `ImageUpload` component in PostJob / MyJobs (drag-drop or file picker) | Frontend |
| 4.5 | Display job images as a gallery in JobDetails | Frontend |
| 4.6 | Create `Notification` model: `Id, UserId, Type, Message, IsRead, CreatedAt` | Backend |
| 4.7 | Create `NotificationsController` (`GET /mine`, `PUT /{id}/read`) | Backend |
| 4.8 | Add `NotificationBell` component to Navbar with unread count badge | Frontend |
| 4.9 | Trigger notifications server-side: on application received, application accepted, job completed | Backend |
| 4.10 | Add polling (every 30s) or SignalR for real-time notification count | Frontend / Backend |

---

### Phase 5 — Admin Panel + Platform Hardening
*Goal: Operations capability and production readiness.*

| # | Task | Area |
|---|---|---|
| 5.1 | Create Admin dashboard page (`/admin`) with user list + job list | Frontend |
| 5.2 | Add `GET /api/admin/users` with pagination + search | Backend |
| 5.3 | Add `PUT /api/admin/users/{id}/suspend` endpoint | Backend |
| 5.4 | Add `DELETE /api/admin/jobs/{id}` (moderation) endpoint | Backend |
| 5.5 | Add `PUT /api/admin/reviews/{id}/remove` endpoint | Backend |
| 5.6 | Add `Report` model: `Id, ReporterId, TargetType, TargetId, Reason, CreatedAt` | Backend |
| 5.7 | Add "Raportează" button on PublicProfile and JobDetails | Frontend |
| 5.8 | Add soft-delete to `JobPost` and `User` (`IsDeleted`, `DeletedAt`) | Backend |
| 5.9 | Add `UpdatedAt` and `CompletedAt` to `JobPost` | Backend |
| 5.10 | Add API integration tests (xUnit + WebApplicationFactory) for critical endpoints | Backend |
| 5.11 | Add frontend E2E tests (Playwright) for register → post → apply → complete flow | Frontend |
| 5.12 | Add CORS restriction to known frontend origins (remove `AllowAnyOrigin`) | Backend |
| 5.13 | Add JWT refresh token endpoint + silent refresh in axios interceptor | Backend + Frontend |
| 5.14 | Add Content Security Policy headers | Backend |

---

## Summary

| Area | Completeness Estimate |
|---|---|
| Authentication & authorization | 75% (missing: refresh token, email verification, rate limiting) |
| Job posting & management | 80% (missing: cancel flow, image upload, status machine) |
| Application workflow | 85% (missing: rejection reason, worker decline) |
| Review system | 60% (backend done; no UI form) |
| User profiles | 70% (missing: portfolio, phone, service area, verified badge) |
| Discovery / search | 50% (missing: pagination, URL filter persistence, debounce) |
| Messaging | 0% (not implemented) |
| Notifications | 0% (not implemented) |
| Admin / moderation | 10% (delete endpoint only; no UI) |
| Security hardening | 40% (critical: password hashing, rate limiting) |
| Testing | 0% (no automated tests) |

**Overall platform completeness: ~55%** — solid foundation for a functional MVP demo, but not production-ready.
