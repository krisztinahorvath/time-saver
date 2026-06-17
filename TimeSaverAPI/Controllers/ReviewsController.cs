using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.DTOs;
using TimeSaverAPI.Models;
using TimeSaverAPI.Services;

namespace TimeSaverAPI.Controllers
{
    [Route("api")]
    [ApiController]
    [Authorize]
    public class ReviewsController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly INotificationService _notifications;
        private readonly IAuditService _audit;

        public ReviewsController(TimeSaverContext context, INotificationService notifications, IAuditService audit)
        {
            _context       = context;
            _notifications = notifications;
            _audit         = audit;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/reviews/given  — returns { reviewedUserId, jobPostId } pairs for current user
        [HttpGet("reviews/given")]
        public async Task<IActionResult> GetGivenReviews()
        {
            var given = await _context.Reviews
                .Where(r => r.ReviewerUserId == CurrentUserId)
                .Select(r => new { r.ReviewedUserId, r.JobPostId })
                .ToListAsync();

            return Ok(given);
        }

        // POST: api/users/{id}/review
        [HttpPost("users/{id}/review")]
        public async Task<IActionResult> PostReview(long id, CreateReviewDto dto)
        {
            if (id == CurrentUserId)
                return BadRequest(new { message = "Nu îți poți lăsa o recenzie ție însuți." });

            if (!dto.JobPostId.HasValue)
                return BadRequest(new { message = "Trebuie să specifici jobul pentru care lași recenzia." });

            var reviewedUser = await _context.Users.FindAsync(id);
            if (reviewedUser == null) return NotFound(new { message = "Utilizatorul nu a fost găsit." });

            // Validate the job exists, is completed, and both users participated
            var sharedJob = await _context.JobPosts.FirstOrDefaultAsync(j =>
                j.Id == dto.JobPostId.Value &&
                j.Status == JobStatus.Completed &&
                ((j.UserId == CurrentUserId && j.AcceptedByUserId == id) ||
                 (j.UserId == id && j.AcceptedByUserId == CurrentUserId)));

            if (sharedJob == null)
                return BadRequest(new { message = "Jobul specificat nu există sau nu este un job comun finalizat." });

            // Duplicate check: same reviewer → same reviewed → same job
            bool alreadyReviewed = await _context.Reviews.AnyAsync(r =>
                r.ReviewerUserId == CurrentUserId &&
                r.ReviewedUserId == id &&
                r.JobPostId == dto.JobPostId);

            if (alreadyReviewed)
                return BadRequest(new { message = "Ai recenzat deja acest utilizator pentru acest job." });

            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(new { message = "Ratingul trebuie să fie între 1 și 5." });

            var reviewer     = await _context.Users.FindAsync(CurrentUserId);
            var reviewerName = reviewer?.Name ?? "Cineva";

            var review = new Review
            {
                ReviewerUserId = CurrentUserId,
                ReviewedUserId = id,
                JobPostId      = dto.JobPostId,
                Rating         = dto.Rating,
                Comment        = dto.Comment?.Trim() ?? string.Empty,
                CreatedAt      = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            await _audit.LogAsync(CurrentUserId, "PostReview", "Review", review.Id,
                $"Review for user {id} with rating {dto.Rating}");

            // Notify reviewed user
            await _notifications.NotifyAsync(
                userId:  id,
                type:    NotificationType.NewReview,
                title:   "Recenzie noua",
                message: $"{reviewerName} ti-a lasat o recenzie de {dto.Rating} stele.");

            return Ok(new { message = "Recenzia a fost trimisă cu succes." });
        }

        // GET: api/users/{id}/reviews
        [AllowAnonymous]
        [HttpGet("users/{id}/reviews")]
        public async Task<IActionResult> GetUserReviews(long id)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == id);
            if (!userExists) return NotFound(new { message = "Utilizatorul nu a fost găsit." });

            var reviews = await _context.Reviews
                .Where(r => r.ReviewedUserId == id)
                .Include(r => r.ReviewerUser)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id                       = r.Id,
                    rating                   = r.Rating,
                    comment                  = r.Comment,
                    createdAt                = r.CreatedAt,
                    reviewerUserId           = r.ReviewerUserId,
                    reviewerName             = r.ReviewerUser != null ? r.ReviewerUser.Name : null,
                    reviewerIsPlusSubscriber = r.ReviewerUser != null &&
                                              r.ReviewerUser.IsPlusSubscriber &&
                                              (r.ReviewerUser.PlusExpiresAt == null || r.ReviewerUser.PlusExpiresAt > DateTime.UtcNow),
                })
                .ToListAsync();

            double averageRating = reviews.Count > 0
                ? reviews.Average(r => r.rating)
                : 0;

            return Ok(new
            {
                averageRating = Math.Round(averageRating, 2),
                reviewCount   = reviews.Count,
                reviews
            });
        }
    }
}
