using TimeSaverAPI.Models;

namespace TimeSaverAPI.DTOs
{
    public class CreateJobPostDto
    {
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required double Budget { get; set; }
        public required JobCategory? Category { get; set; }
        public required string Location { get; set; }
        public DateTime? Deadline { get; set; }
        public string? SpecialRequirements { get; set; }
    }
}
