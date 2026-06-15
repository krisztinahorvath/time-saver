namespace TimeSaverAPI.Models
{
    public class Message
    {
        public long Id { get; set; }
        public long JobPostId { get; set; }
        public virtual JobPost JobPost { get; set; } = null!;
        public long SenderId { get; set; }
        public virtual User Sender { get; set; } = null!;
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
    }
}
