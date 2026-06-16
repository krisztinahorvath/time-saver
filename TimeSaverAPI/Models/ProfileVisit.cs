namespace TimeSaverAPI.Models
{
    public class ProfileVisit
    {
        public long Id { get; set; }
        public long VisitorUserId { get; set; }
        public long ProfileUserId { get; set; }
        public DateTime VisitedAt { get; set; }

        public virtual User? VisitorUser { get; set; }
        public virtual User? ProfileUser { get; set; }
    }
}
