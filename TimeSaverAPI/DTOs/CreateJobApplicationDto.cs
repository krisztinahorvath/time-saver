namespace TimeSaverAPI.DTOs
{
    public class CreateJobApplicationDto
    {
        public required string Message { get; set; }
        public long JobPostId { get; set; }
    }
}
