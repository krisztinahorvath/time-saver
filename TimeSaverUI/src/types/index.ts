// These string literals match exactly what the backend returns with StringEnumConverter
export type JobStatus = 'Pending' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
export type JobApplicationStatus = 'Pending' | 'Accepted' | 'Rejected';
export type UserType = 'Admin' | 'Employer' | 'Worker';
export type JobCategory =
  | 'Cleaning' | 'Delivery' | 'Tutoring' | 'Gardening' | 'Moving'
  | 'PetCare' | 'TechSupport' | 'Other' | 'Repairs' | 'Plumbing'
  | 'Electrical' | 'FurnitureAssembly' | 'Design' | 'Marketing'
  | 'Babysitting' | 'Events';

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
  reviews: ReviewItem[];
}

export interface JobPostImage {
  id: number;
  imageUrl: string;
  jobPostId: number;
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
  Cleaning: 'Curățenie',
  Delivery: 'Livrare & Transport',
  Tutoring: 'Meditații',
  Gardening: 'Grădinărit',
  Moving: 'Mutări',
  PetCare: 'Îngrijire animale',
  TechSupport: 'IT & Tech support',
  Other: 'Altele',
  Repairs: 'Reparații',
  Plumbing: 'Instalații',
  Electrical: 'Electricitate',
  FurnitureAssembly: 'Montaj mobilier',
  Design: 'Design',
  Marketing: 'Marketing',
  Babysitting: 'Babysitting',
  Events: 'Evenimente',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  Pending: 'În așteptare',
  Open: 'Disponibil',
  InProgress: 'În desfășurare',
  Completed: 'Finalizat',
  Cancelled: 'Anulat',
};
