export interface UserRegisterDTO {
    name: string;
    email: string;
    password: string;
    bio: string;
    userType: 'Admin' | 'Employer' | 'Worker';
}