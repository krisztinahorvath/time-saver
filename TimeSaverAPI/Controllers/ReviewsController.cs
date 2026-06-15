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

        // POST: api/users/{id}/review
        [HttpPost("users/{id}/review")]
        public async Task<ActionResult<Review>> PostReview(long id, CreateReviewDto dto)
        {
            if (id == CurrentUserId)
                return BadRequest("You cannot review yourself.");

            var reviewedUserExists = await _context.Users.AnyAsync(u => u.Id == id);
            if (!reviewedUserExists) return NotFound("User not found.");

            // must have completed at least one job together, in either direction
            bool workedTogether = await _context.JobPosts.AnyAsync(j =>
                j.Status == JobStatus.Completed &&
                ((j.UserId == CurrentUserId && j.AcceptedByUserId == id) ||
                 (j.UserId == id && j.AcceptedByUserId == CurrentUserId)));

            if (!workedTogether)
                return BadRequest("You can only review users you have completed a job with.");

            bool alreadyReviewed = await _context.Reviews.AnyAsync(r =>
                r.ReviewerUserId == CurrentUserId && r.ReviewedUserId == id);

            if (alreadyReviewed)
                return BadRequest("You have already reviewed this user.");

            var review = new Review
            {
                ReviewerUserId = CurrentUserId,
                ReviewedUserId = id,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUserReviews), new { id = review.ReviewedUserId }, review);
        }

        // GET: api/users/{id}/reviews
        [AllowAnonymous]
        [HttpGet("users/{id}/reviews")]
        public async Task<ActionResult> GetUserReviews(long id)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == id);
            if (!userExists) return NotFound("User not found.");

            var reviews = await _context.Reviews
                .Where(r => r.ReviewedUserId == id)
                .Include(r => r.ReviewerUser)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            double averageRating = reviews.Count > 0
                ? reviews.Average(r => r.Rating)
                : 0;

            return Ok(new
            {
                AverageRating = Math.Round(averageRating, 2),
                ReviewCount = reviews.Count,
                Reviews = reviews
            });
        }
    }
}