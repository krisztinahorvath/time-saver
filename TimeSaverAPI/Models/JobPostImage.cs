namespace TimeSaverAPI.Models
{
    public class JobPostImage
    {
        public long Id { get; set; }
        public string ImageUrl { get; set; } = null!;

        public long JobPostId { get; set; }
        public virtual JobPost JobPost { get; set; } = null!; 
    }
}
