namespace TimeSaverAPI.Models
{
    public enum JobStatus
    {
        Pending,
        Open,
        InProgress,
        Completed,
        Cancelled
    }

    public enum JobCategory
    {
        Cleaning = 0,
        Delivery = 1,
        Tutoring = 2,
        Gardening = 3,
        Moving = 4,
        PetCare = 5,
        TechSupport = 6,
        Other = 7,
        Repairs = 8,
        Plumbing = 9,
        Electrical = 10,
        FurnitureAssembly = 11,
        Design = 12,
        Marketing = 13,
        Babysitting = 14,
        Events = 15
    }

    public class JobPost
    {
        public long Id { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required double Budget { get; set; }
        public required JobStatus Status { get; set; }
        public JobCategory Category { get; set; }
        public required string Location { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? Deadline { get; set; }
        public string? SpecialRequirements { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public long UserId { get; set; }
        public virtual User User { get; set; } = null!;
        public long? AcceptedByUserId { get; set; }
        public virtual User? AcceptedByUser { get; set; }

        public virtual ICollection<JobPostImage> Images { get; set; } = [];
        public virtual ICollection<JobApplication> JobApplications { get; set; } = [];
        public virtual ICollection<Message> Messages { get; set; } = [];
    }
}
