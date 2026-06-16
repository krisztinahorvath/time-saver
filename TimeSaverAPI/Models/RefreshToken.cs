namespace TimeSaverAPI.Models
{
    public class RefreshToken
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public string TokenHash { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime CreatedAt { get; set; }

        public User User { get; set; } = null!;
    }
}
