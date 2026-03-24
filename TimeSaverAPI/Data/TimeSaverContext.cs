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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
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

            // job posts and job post images
            modelBuilder.Entity<JobPostImage>()
                .HasOne(i => i.JobPost)
                .WithMany(j => j.Images)
                .HasForeignKey(i => i.JobPostId);

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
        }
    }
}
