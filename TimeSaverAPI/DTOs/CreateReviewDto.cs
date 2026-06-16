namespace TimeSaverAPI.DTOs
{
    public class CreateReviewDto
    {
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public long? JobPostId { get; set; }
    }
}
