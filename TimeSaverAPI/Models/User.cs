namespace TimeSaverAPI.Models
{
    public enum UserType
    {
        Admin, 
        Employer, 
        Worker
    }

    public class User
    {
        public long Id { get; set; }
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Bio { get; set; } = null!;
        public UserType UserType { get; set; }

        public virtual ICollection<JobPost>? JobPosts { get; set; }

        public virtual ICollection<JobApplication>? JobApplications { get; set; }

        // Reviews this user wrote
        public virtual ICollection<Review>? GivenReviews { get; set; }

        // Reviews this user received
        public virtual ICollection<Review>? ReceivedReviews { get; set; }
    }
}
