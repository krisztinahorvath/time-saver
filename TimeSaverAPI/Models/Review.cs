namespace TimeSaverAPI.Models
{
    public class Review
    {
        public long Id { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public long? ReviewerUserId { get; set; }
        public User ReviewerUser { get; set; } = null!;

        public long? ReviewedUserId { get; set; }
        public User ReviewedUser { get; set; } = null!;

        // Which completed job this review is tied to (nullable for old reviews created before Phase 7)
        public long? JobPostId { get; set; }
        public virtual JobPost? JobPost { get; set; }
    }
}
