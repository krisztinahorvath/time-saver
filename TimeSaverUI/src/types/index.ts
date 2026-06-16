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
  | 'JobCompleted';

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
  userType: UserType;
  averageRating: number;
  reviewCount: number;
}

export interface PublicProfile {
  id: number;
  name: string;
  bio: string;
  userType: UserType;
  averageRating: number;
  reviewCount: number;
  completedJobsCount: number;
  memberSince: string;
  reviews: ReviewItem[];
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
  user?: { id: number; name: string; email: string };
  jobPost?: {
    title?: string;
    budget?: number;
    location?: string;
    status?: JobStatus;
    userId?: number;
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
  user?: { id: number; name: string; email: string };
  acceptedByUser?: { id: number; name: string };
  images: JobPostImage[];
  jobApplications: JobApplication[];
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

export interface CreateJobPostPayload {
  title: string;
  description: string;
  budget: number;
  category: JobCategory;
  location: string;
  deadline?: string;
  specialRequirements?: string;
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
};
