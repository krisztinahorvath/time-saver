namespace TimeSaverAPI.Models
{
    public enum JobStatus
    {
        Pending, 
        Open, 
        InProgress, 
        Completed
    }

    public class JobPost
    {
        public long Id { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required double Budget { get; set; }
        public required JobStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }

        public long UserId { get; set; }
        public virtual User User { get; set; } = null!;

        // 1:n with JobPostImage
        public virtual ICollection<JobPostImage> Images { get; set; } = [];

        // 1:n with JobApplication
        public virtual ICollection<JobApplication> JobApplications { get; set; } = [];

    }
}
