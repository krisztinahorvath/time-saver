using System.ComponentModel.DataAnnotations.Schema;

namespace TimeSaverAPI.Models
{
    public enum JobApplicationStatus
    {
        Pending,
        Accepted,
        Rejected
    }

    public class JobApplication
    {
        public long Id { get; set; }
        public string Message { get; set; } = string.Empty;

        // Column attribute preserves the existing DB column name (has a typo) while fixing the C# property name
        [Column("JobApllicationStatus")]
        public JobApplicationStatus JobApplicationStatus { get; set; }

        public DateTime CreatedAt { get; set; }

        public long JobPostId { get; set; }
        public JobPost JobPost { get; set; } = null!;

        public long? UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
