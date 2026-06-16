namespace TimeSaverAPI.Models
{
    public enum ReportType   { User, Review, Job }
    public enum ReportStatus { Open, UnderReview, Resolved, Rejected }

    public class Report
    {
        public long Id { get; set; }
        public long ReporterUserId { get; set; }
        public ReportType Type { get; set; }
        public ReportStatus Status { get; set; }
        public string Reason { get; set; } = null!;

        // Exactly one of these is set depending on Type
        public long? ReportedUserId { get; set; }
        public long? ReportedReviewId { get; set; }
        public long? ReportedJobPostId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? AdminNote { get; set; }

        public User ReporterUser { get; set; } = null!;
        public User? ReportedUser { get; set; }
        public Review? ReportedReview { get; set; }
        public JobPost? ReportedJobPost { get; set; }
    }
}
