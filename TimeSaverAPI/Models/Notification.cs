namespace TimeSaverAPI.Models
{
    public enum NotificationType
    {
        NewApplication = 0,
        ApplicationAccepted = 1,
        NewMessage = 2,
        NewReview = 3,
        JobCompleted = 4,
        PaymentHeld = 5,
        PaymentReleased = 6,
    }

    public class Notification
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public virtual User User { get; set; } = null!;
        public NotificationType Type { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public long? RelatedJobPostId { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
