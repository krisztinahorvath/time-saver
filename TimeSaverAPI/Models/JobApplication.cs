namespace TimeSaverAPI.Models
{
    public enum JobApplicationStatus
    {
        Pending, 
        Accepted, 
        Rejected
    }

    public class JobApplication
    {
        public long Id { get; set; }
        public string Message { get; set; } = string.Empty;
        public JobApplicationStatus JobApllicationStatus { get; set; }
        public DateTime CreatedAt { get; set; }

        public long JobPostId { get; set; }
        public JobPost JobPost { get; set; } = null!;

        public long? UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
