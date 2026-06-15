using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.DTOs;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Controllers
{
    [Route("api")]
    [ApiController]
    [Authorize]
    public class ReviewsController : ControllerBase
    {
        private readonly TimeSaverContext _context;

        public ReviewsController(TimeSaverContext context)
        {
            _context = context;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/reviews/given
        // Returns the list of user IDs that the current user has already reviewed
        [HttpGet("reviews/given")]
        public async Task<IActionResult> GetGivenReviews()
        {
            var reviewedIds = await _context.Reviews
                .Where(r => r.ReviewerUserId == CurrentUserId)
                .Select(r => r.ReviewedUserId)
                .ToListAsync();

            return Ok(reviewedIds);
        }

        // POST: api/users/{id}/review
        [HttpPost("users/{id}/review")]
        public async Task<IActionResult> PostReview(long id, CreateReviewDto dto)
        {
            if (id == CurrentUserId)
                return BadRequest(new { message = "Nu îți poți lăsa o recenzie ție însuți." });

            var reviewedUserExists = await _context.Users.AnyAsync(u => u.Id == id);
            if (!reviewedUserExists) return NotFound(new { message = "Utilizatorul nu a fost găsit." });

            bool workedTogether = await _context.JobPosts.AnyAsync(j =>
                j.Status == JobStatus.Completed &&
                ((j.UserId == CurrentUserId && j.AcceptedByUserId == id) ||
                 (j.UserId == id && j.AcceptedByUserId == CurrentUserId)));

            if (!workedTogether)
                return BadRequest(new { message = "Poți recenza doar utilizatori cu care ai finalizat un job." });

            bool alreadyReviewed = await _context.Reviews.AnyAsync(r =>
                r.ReviewerUserId == CurrentUserId && r.ReviewedUserId == id);

            if (alreadyReviewed)
                return BadRequest(new { message = "Ai recenzat deja acest utilizator." });

            var review = new Review
            {
                ReviewerUserId = CurrentUserId,
                ReviewedUserId = id,
                Rating = dto.Rating,
                Comment = dto.Comment?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

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
                    id = r.Id,
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt,
                    reviewerUserId = r.ReviewerUserId,
                    reviewerName = r.ReviewerUser != null ? r.ReviewerUser.Name : null
                })
                .ToListAsync();

            double averageRating = reviews.Count > 0
                ? reviews.Average(r => r.rating)
                : 0;

            return Ok(new
            {
                averageRating = Math.Round(averageRating, 2),
                reviewCount = reviews.Count,
                reviews
            });
        }
    }
}
