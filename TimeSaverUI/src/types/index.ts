// These string literals match exactly what the backend returns with StringEnumConverter
export type JobStatus = 'Pending' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
export type JobApplicationStatus = 'Pending' | 'Accepted' | 'Rejected';
export type UserType = 'Admin' | 'Employer' | 'Worker';
export type JobCategory =
  | 'Cleaning' | 'Delivery' | 'Tutoring' | 'Gardening' | 'Moving'
  | 'PetCare' | 'TechSupport' | 'Other' | 'Repairs' | 'Plumbing'
  | 'Electrical' | 'FurnitureAssembly' | 'Design' | 'Marketing'
  | 'Babysitting' | 'Events';

export type NotificationType =
  | 'NewApplication'
  | 'ApplicationAccepted'
  | 'NewMessage'
  | 'NewReview'
  | 'JobCompleted'
  | 'PaymentHeld'
  | 'PaymentReleased';

export type JobPaymentStatus =
  | 'NotStarted'
  | 'CheckoutPending'
  | 'PaidHeld'
  | 'ReleasedToWorker'
  | 'RefundPending'
  | 'Refunded'
  | 'Failed';

export type PaymentSource = 'Card' | 'Wallet';

export interface JobPayment {
  id: number;
  amount: number;
  currency: string;
  platformFeeAmount?: number;
  workerAmount?: number;
  status: JobPaymentStatus;
  paymentSource?: PaymentSource;
  paidAt?: string;
  releasedAt?: string;
  stripeTransferId?: string;
}

export interface PaymentStatusInfo {
  status: string;
  payment: JobPayment | null;
  workerIsPlus?: boolean;
  estimatedFeePercent?: number;
}

export interface ConnectStatus {
  connected: boolean;
  onboardingComplete: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

export type ReportType   = 'User' | 'Review' | 'Job';
export type ReportStatus = 'Open' | 'UnderReview' | 'Resolved' | 'Rejected';

export interface Report {
  id: number;
  type: ReportType;
  status: ReportStatus;
  reason: string;
  createdAt: string;
  adminNote?: string;
  reportedUserId?: number;
  reportedReviewId?: number;
  reportedJobPostId?: number;
}

export interface AdminReport extends Report {
  reporterName: string;
  reporterEmail: string;
  reportedUserName?: string;
  reportedJobTitle?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  userType: UserType;
  isSuspended: boolean;
  createdAt: string;
  jobCount: number;
  reviewCount: number;
}

export interface AdminJob {
  id: number;
  title: string;
  budget: number;
  status: JobStatus;
  category: JobCategory;
  location: string;
  createdAt: string;
  userId: number;
  userName?: string;
}

export interface AdminStats {
  totalUsers: number;
  suspendedUsers: number;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  totalReviews: number;
  openReports: number;
  totalMessages: number;
  recentUsers: AdminUser[];
  recentJobs: AdminJob[];
}

export interface AuthUser {
  userId: number;
  name: string;
  userType: UserType;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  bio: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  userType: UserType;
  averageRating: number;
  reviewCount: number;
  isPlusSubscriber?: boolean;
}

export interface PublicProfile {
  id: number;
  name: string;
  bio: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  userType: UserType;
  isPlusSubscriber?: boolean;
  averageRating: number;
  reviewCount: number;
  completedJobsCount: number;
  memberSince: string;
  reviews: ReviewItem[];
  isSuspended?: boolean;
}

export interface PlusStatus {
  isPlusSubscriber: boolean;
  isVerified: boolean;
  plusActivatedAt: string | null;
  plusExpiresAt: string | null;
  hasStripeSubscription: boolean;
  statusMessage: string;
}

export interface ProfileVisitor {
  visitorUserId: number;
  visitorName: string;
  visitorType: UserType;
  visitedAt: string;
  isPlusSubscriber?: boolean;
}

export interface JobPostImage {
  id: number;
  imageUrl: string;
  isMain: boolean;
  uploadedAt: string;
  jobPostId: number;
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedJobPostId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface JobApplication {
  id: number;
  message: string;
  jobApplicationStatus: JobApplicationStatus;
  createdAt: string;
  jobPostId: number;
  userId?: number;
  user?: { id: number; name: string; email: string; isPlusSubscriber?: boolean };
  jobPost?: {
    title?: string;
    budget?: number;
    location?: string;
    status?: JobStatus;
    userId?: number;
    payment?: JobPayment;
  };
}

export interface JobPost {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: JobStatus;
  category: JobCategory;
  location: string;
  createdAt: string;
  deadline?: string;
  specialRequirements?: string;
  userId: number;
  acceptedByUserId?: number;
  user?: { id: number; name: string; email: string; isPlusSubscriber?: boolean };
  acceptedByUser?: { id: number; name: string; isPlusSubscriber?: boolean };
  images: JobPostImage[];
  jobApplications: JobApplication[];
  payment?: JobPayment;
}

// Lightweight item returned by GET /api/JobPosts (list endpoint)
export interface JobPostListItem {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: JobStatus;
  category: JobCategory;
  location: string;
  createdAt: string;
  deadline?: string;
  userId: number;
  userName?: string;
  employerAverageRating: number;
  employerReviewCount: number;
  applicationCount: number;
  mainImageUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  isPlusOnly?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReviewItem {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerUserId?: number;
  reviewedUserId?: number;
  reviewerName?: string;
  reviewerIsPlusSubscriber?: boolean;
  jobPostId?: number | null;
}

// Billing
export interface BillingTransaction {
  id: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
  jobPostId?: number;
  jobTitle?: string;
  stripeTransferId?: string;
}

export interface BillingSummary {
  balance: number;
  walletBalance: number;
  walletDebits: number;
  earningsBalance: number;
  pendingHeldPayments: number;
  taskPaymentsHeld: number;
  taskPaymentsReleased: number;
  taskPaymentsMade: number;
  totalBalance: number;
  currency: string;
  recentTransactions: BillingTransaction[];
  hasStripeCustomer: boolean;
  connectOnboardingComplete: boolean;
}

export interface JobPaymentReceipt {
  id: number;
  jobPostId: number;
  jobTitle?: string;
  amount: number;
  platformFeeAmount?: number;
  workerAmount?: number;
  currency: string;
  status: string;
  paymentSource?: string;
  paidAt?: string;
  releasedAt?: string;
  createdAt: string;
  role: 'employer' | 'worker';
  stripeTransferId?: string;
}

export interface BillingProfileData {
  id?: number;
  displayName: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
}

export interface StripeInvoice {
  id: string;
  number?: string;
  status?: string;
  amountPaid: number;
  currency?: string;
  created: string;
  invoicePdfUrl?: string;
  hostedUrl?: string;
}

// Returned by GET /api/reviews/given
export interface GivenReviewEntry {
  reviewedUserId: number | null;
  jobPostId: number | null;
}

export interface ReviewsResponse {
  averageRating: number;
  reviewCount: number;
  reviews: ReviewItem[];
}

export interface Message {
  id: number;
  jobPostId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface LoginResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  userId: number;
  name: string;
  userType: UserType;
}

export interface PublicJobItem {
  id: number;
  title: string;
  budget: number;
  category: JobCategory;
  location: string;
  createdAt: string;
  deadline?: string;
}

export interface CreateJobPostPayload {
  title: string;
  description: string;
  budget: number;
  category: JobCategory;
  location: string;
  deadline?: string;
  specialRequirements?: string;
  latitude?: number | null;
  longitude?: number | null;
  isPlusOnly?: boolean;
}

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  Cleaning:         'Curatenie',
  Delivery:         'Livrare & Transport',
  Tutoring:         'Meditatii',
  Gardening:        'Gradinarit',
  Moving:           'Mutari',
  PetCare:          'Ingrijire animale',
  TechSupport:      'IT & Tech support',
  Other:            'Altele',
  Repairs:          'Reparatii',
  Plumbing:         'Instalatii',
  Electrical:       'Electricitate',
  FurnitureAssembly:'Montaj mobilier',
  Design:           'Design',
  Marketing:        'Marketing',
  Babysitting:      'Babysitting',
  Events:           'Evenimente',
};

export const CATEGORY_ICONS: Record<JobCategory, string> = {
  Cleaning:          '🧹',
  Delivery:          '🚚',
  Tutoring:          '📚',
  Gardening:         '🌿',
  Moving:            '📦',
  PetCare:           '🐾',
  TechSupport:       '💻',
  Other:             '🔖',
  Repairs:           '🔧',
  Plumbing:          '🚰',
  Electrical:        '💡',
  FurnitureAssembly: '🛋️',
  Design:            '🎨',
  Marketing:         '📣',
  Babysitting:       '👶',
  Events:            '🎉',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  Pending:    'In asteptare',
  Open:       'Disponibil',
  InProgress: 'In desfasurare',
  Completed:  'Finalizat',
  Cancelled:  'Anulat',
};

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  NewApplication:      '📩',
  ApplicationAccepted: '✅',
  NewMessage:          '💬',
  NewReview:           '⭐',
  JobCompleted:        '🏆',
  PaymentHeld:         '🔒',
  PaymentReleased:     '💸',
};
