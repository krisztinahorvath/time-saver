namespace TimeSaverAPI.DTOs
{
    public class JobPostListItemDto
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Budget { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? Deadline { get; set; }
        public long UserId { get; set; }
        public string? UserName { get; set; }
        public double EmployerAverageRating { get; set; }
        public int EmployerReviewCount { get; set; }
        public int ApplicationCount { get; set; }
        public string? MainImageUrl { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public bool IsPlusOnly { get; set; }
    }
}
