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

        public long? ReviewedUserId {  get; set; }
        public User ReviewedUser { get; set; } = null!;
    }
}
