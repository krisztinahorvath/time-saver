using TimeSaverAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace TimeSaverAPI.Data
{
    public class TimeSaverContext : DbContext
    {
        public TimeSaverContext() { }

        public TimeSaverContext(DbContextOptions<TimeSaverContext> options) : base(options)
        {
        }

        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<JobPost> JobPosts { get; set; }
        public virtual DbSet<JobApplication> JobApplications { get; set; }
        public virtual DbSet<JobPostImage> JobPostImages { get; set; }
        public virtual DbSet<Review> Reviews { get; set; }
        public virtual DbSet<Message> Messages { get; set; }
        public virtual DbSet<Notification> Notifications { get; set; }
        public virtual DbSet<RefreshToken> RefreshTokens { get; set; }
        public virtual DbSet<Report> Reports { get; set; }
        public virtual DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // users and reviews
            modelBuilder.Entity<Review>()
                .HasOne(r => r.ReviewerUser)
                .WithMany(u => u.GivenReviews)
                .HasForeignKey(r => r.ReviewerUserId)
                .OnDelete(DeleteBehavior.ClientCascade);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.ReviewedUser)
                .WithMany(u => u.ReceivedReviews)
                .HasForeignKey(r => r.ReviewedUserId)
                .OnDelete(DeleteBehavior.ClientCascade);

            // Phase 7: review → job (nullable; if job deleted, nullify not cascade)
            modelBuilder.Entity<Review>()
                .HasOne(r => r.JobPost)
                .WithMany()
                .HasForeignKey(r => r.JobPostId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            // job posts and job post images
            modelBuilder.Entity<JobPostImage>()
                .HasOne(i => i.JobPost)
                .WithMany(j => j.Images)
                .HasForeignKey(i => i.JobPostId)
                .OnDelete(DeleteBehavior.Cascade);

            // job posts and users
            modelBuilder.Entity<JobPost>()
                .HasOne(j => j.User)
                .WithMany(u => u.JobPosts)
                .HasForeignKey(j => j.UserId);

            // job applications and users
            modelBuilder.Entity<JobApplication>()
                .HasOne(j => j.User)
                .WithMany(u => u.JobApplications)
                .HasForeignKey(j => j.UserId)
                .OnDelete(DeleteBehavior.ClientCascade);

            // job applications and jobs
            modelBuilder.Entity<JobApplication>()
                .HasOne(ja => ja.JobPost)
                .WithMany(j => j.JobApplications)
                .HasForeignKey(ja => ja.JobPostId);

            // messages → job post
            modelBuilder.Entity<Message>()
                .HasOne(m => m.JobPost)
                .WithMany(j => j.Messages)
                .HasForeignKey(m => m.JobPostId)
                .OnDelete(DeleteBehavior.Cascade);

            // messages → sender (no cascade to avoid multiple cascade paths)
            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.ClientCascade);

            // notifications → user
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Phase 3: discovery indexes for filtering/sorting
            modelBuilder.Entity<JobPost>().HasIndex(j => j.Status);
            modelBuilder.Entity<JobPost>().HasIndex(j => j.Category);
            modelBuilder.Entity<JobPost>().HasIndex(j => j.CreatedAt);

            // Phase 3: User.CreatedAt SQL default (for existing rows during migration)
            modelBuilder.Entity<User>()
                .Property(u => u.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            // Phase 4: Notification indexes
            modelBuilder.Entity<Notification>().HasIndex(n => n.UserId);
            modelBuilder.Entity<Notification>().HasIndex(n => new { n.UserId, n.IsRead });

            // Phase 5: RefreshTokens
            modelBuilder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RefreshToken>()
                .HasIndex(rt => rt.TokenHash)
                .IsUnique();

            // Phase 5: Reports
            modelBuilder.Entity<Report>()
                .HasOne(r => r.ReporterUser)
                .WithMany(u => u.ReportsSubmitted)
                .HasForeignKey(r => r.ReporterUserId)
                .OnDelete(DeleteBehavior.ClientCascade);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.ReportedUser)
                .WithMany(u => u.ReportsAgainstMe)
                .HasForeignKey(r => r.ReportedUserId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.ReportedReview)
                .WithMany()
                .HasForeignKey(r => r.ReportedReviewId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.ReportedJobPost)
                .WithMany()
                .HasForeignKey(r => r.ReportedJobPostId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<Report>().HasIndex(r => r.Status);
            modelBuilder.Entity<Report>().HasIndex(r => r.ReporterUserId);

            // Phase 5: AuditLogs
            modelBuilder.Entity<AuditLog>()
                .HasOne(a => a.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<AuditLog>().HasIndex(a => a.Timestamp);
            modelBuilder.Entity<AuditLog>().HasIndex(a => a.EntityType);
        }
    }
}
