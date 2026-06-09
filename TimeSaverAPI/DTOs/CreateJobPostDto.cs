namespace TimeSaverAPI.DTOs
{
    public class CreateJobPostDto
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required double Budget { get; set; }
    }
}
