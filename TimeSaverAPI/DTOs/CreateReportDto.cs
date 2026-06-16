namespace TimeSaverAPI.DTOs
{
    public class CreateReportDto
    {
        public string Type { get; set; } = null!;
        public string Reason { get; set; } = null!;
        public long? ReportedUserId { get; set; }
        public long? ReportedReviewId { get; set; }
        public long? ReportedJobPostId { get; set; }
    }

    public class AdminUpdateReportDto
    {
        public string Status { get; set; } = null!;
        public string? AdminNote { get; set; }
    }
}
