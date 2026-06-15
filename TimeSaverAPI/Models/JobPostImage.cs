namespace TimeSaverAPI.Models
{
    public class JobPostImage
    {
        public long Id { get; set; }
        public string ImageUrl { get; set; } = null!;
        public bool IsMain { get; set; }
        public DateTime UploadedAt { get; set; }

        public long JobPostId { get; set; }
        public virtual JobPost JobPost { get; set; } = null!;
    }
}
