namespace TimeSaverAPI.Models
{
    public class AuditLog
    {
        public long Id { get; set; }
        public long? UserId { get; set; }
        public string Action { get; set; } = null!;
        public string EntityType { get; set; } = null!;
        public long? EntityId { get; set; }
        public string? Details { get; set; }
        public DateTime Timestamp { get; set; }

        public User? User { get; set; }
    }
}
