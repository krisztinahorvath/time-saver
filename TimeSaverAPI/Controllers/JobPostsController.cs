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
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class JobPostsController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly INotificationService _notifications;

        public JobPostsController(TimeSaverContext context, INotificationService notifications)
        {
            _context       = context;
            _notifications = notifications;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/JobPosts
        [HttpGet]
        public async Task<IActionResult> GetJobPosts(
            [FromQuery] string? keyword,
            [FromQuery] JobCategory? category,
            [FromQuery] string? location,
            [FromQuery] double? minPrice,
            [FromQuery] double? maxPrice,
            [FromQuery] string? sortBy,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            var query = _context.JobPosts.Where(j => j.Status == JobStatus.Open);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(j => j.Title.Contains(keyword) || j.Description.Contains(keyword));

            if (category.HasValue)
                query = query.Where(j => j.Category == category.Value);

            if (!string.IsNullOrWhiteSpace(location))
                query = query.Where(j => j.Location.Contains(location));

            if (minPrice.HasValue)
                query = query.Where(j => j.Budget >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(j => j.Budget <= maxPrice.Value);

            query = sortBy switch
            {
                "budgetAsc"  => query.OrderBy(j => j.Budget),
                "budgetDesc" => query.OrderByDescending(j => j.Budget),
                _            => query.OrderByDescending(j => j.CreatedAt),
            };

            var totalCount = await query.CountAsync();

            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var jobs = await query
                .Include(j => j.User).ThenInclude(u => u!.ReceivedReviews)
                .Include(j => j.JobApplications)
                .Include(j => j.Images)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = jobs.Select(j =>
            {
                var mainImg = j.Images?.FirstOrDefault(i => i.IsMain) ?? j.Images?.FirstOrDefault();
                return new JobPostListItemDto
                {
                    Id          = j.Id,
                    Title       = j.Title,
                    Description = j.Description,
                    Budget      = j.Budget,
                    Status      = j.Status.ToString(),
                    Category    = j.Category.ToString(),
                    Location    = j.Location,
                    CreatedAt   = j.CreatedAt,
                    Deadline    = j.Deadline,
                    UserId      = j.UserId,
                    UserName    = j.User?.Name,
                    EmployerAverageRating = j.User?.ReceivedReviews != null && j.User.ReceivedReviews.Any()
                        ? Math.Round(j.User.ReceivedReviews.Average(r => r.Rating), 1)
                        : 0,
                    EmployerReviewCount = j.User?.ReceivedReviews?.Count ?? 0,
                    ApplicationCount    = j.JobApplications?.Count ?? 0,
                    MainImageUrl        = mainImg?.ImageUrl,
                };
            }).ToList();

            return Ok(new PagedResult<JobPostListItemDto>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
            });
        }

        // GET: api/JobPosts/mine
        [HttpGet("mine")]
        public async Task<ActionResult<IEnumerable<JobPost>>> GetMyJobPosts()
        {
            return await _context.JobPosts
                .Include(j => j.Images)
                .Include(j => j.JobApplications)
                    .ThenInclude(a => a.User)
                .Include(j => j.AcceptedByUser)
                .Where(j => j.UserId == CurrentUserId)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();
        }

        // GET: api/JobPosts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<JobPost>> GetJobPost(long id)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.User)
                .Include(j => j.Images)
                .Include(j => j.JobApplications)
                    .ThenInclude(a => a.User)
                .Include(j => j.AcceptedByUser)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (jobPost == null) return NotFound();

            return jobPost;
        }

        // POST: api/JobPosts
        [HttpPost]
        public async Task<ActionResult<JobPost>> PostJobPost(CreateJobPostDto dto)
        {
            var jobPost = new JobPost
            {
                Title               = dto.Title,
                Description         = dto.Description,
                Budget              = dto.Budget,
                Category            = dto.Category!.Value,
                Location            = dto.Location,
                Deadline            = dto.Deadline,
                SpecialRequirements = dto.SpecialRequirements,
                Status              = JobStatus.Open,
                CreatedAt           = DateTime.UtcNow,
                UserId              = CurrentUserId
            };

            _context.JobPosts.Add(jobPost);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetJobPost), new { id = jobPost.Id }, jobPost);
        }

        // PUT: api/JobPosts/5/accept
        [HttpPut("{id}/accept")]
        public async Task<IActionResult> AcceptJobPost(long id, AcceptJobPostDto dto)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.JobApplications)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (jobPost == null) return NotFound();
            if (jobPost.UserId != CurrentUserId) return Forbid();

            if (jobPost.Status != JobStatus.Open)
                return BadRequest(new { message = "Poți accepta aplicații doar pentru joburi cu status Open." });

            var application = jobPost.JobApplications
                .FirstOrDefault(a => a.Id == dto.ApplicationId);

            if (application == null) return NotFound(new { message = "Aplicația nu a fost găsită." });

            foreach (var app in jobPost.JobApplications)
            {
                app.JobApplicationStatus = app.Id == dto.ApplicationId
                    ? JobApplicationStatus.Accepted
                    : JobApplicationStatus.Rejected;
            }

            jobPost.Status           = JobStatus.InProgress;
            jobPost.AcceptedByUserId = application.UserId;

            await _context.SaveChangesAsync();

            // Notify accepted worker
            if (application.UserId.HasValue)
            {
                await _notifications.NotifyAsync(
                    userId:           application.UserId.Value,
                    type:             NotificationType.ApplicationAccepted,
                    title:            "Aplicatie acceptata!",
                    message:          $"Aplicatia ta la jobul '{jobPost.Title}' a fost acceptata. Poti incepe lucrul!",
                    relatedJobPostId: jobPost.Id);
            }

            return NoContent();
        }

        // PUT: api/JobPosts/5/cancel
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelJobPost(long id)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.JobApplications)
                .FirstOrDefaultAsync(j => j.Id == id);

            if (jobPost == null) return NotFound();
            if (jobPost.UserId != CurrentUserId) return Forbid();

            if (jobPost.Status == JobStatus.Completed)
                return BadRequest(new { message = "Un job finalizat nu poate fi anulat." });

            if (jobPost.Status == JobStatus.Cancelled)
                return BadRequest(new { message = "Jobul este deja anulat." });

            foreach (var app in jobPost.JobApplications)
            {
                if (app.JobApplicationStatus == JobApplicationStatus.Pending)
                    app.JobApplicationStatus = JobApplicationStatus.Rejected;
            }

            jobPost.Status = JobStatus.Cancelled;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Jobul a fost anulat." });
        }

        // PUT: api/JobPosts/5/complete
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteJobPost(long id)
        {
            var jobPost = await _context.JobPosts
                .FirstOrDefaultAsync(j => j.Id == id);

            if (jobPost == null) return NotFound();

            if (jobPost.UserId != CurrentUserId && jobPost.AcceptedByUserId != CurrentUserId)
                return Forbid();

            if (jobPost.Status != JobStatus.InProgress)
                return BadRequest(new { message = "Jobul trebuie să fie în desfășurare pentru a fi finalizat." });

            jobPost.Status = JobStatus.Completed;
            await _context.SaveChangesAsync();

            // Notify the other party
            long? recipientId = CurrentUserId == jobPost.UserId
                ? jobPost.AcceptedByUserId
                : (long?)jobPost.UserId;

            if (recipientId.HasValue)
            {
                await _notifications.NotifyAsync(
                    userId:           recipientId.Value,
                    type:             NotificationType.JobCompleted,
                    title:            "Job finalizat",
                    message:          $"Jobul '{jobPost.Title}' a fost marcat ca finalizat.",
                    relatedJobPostId: jobPost.Id);
            }

            return Ok(jobPost);
        }

        // DELETE: api/JobPosts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJobPost(long id)
        {
            var jobPost = await _context.JobPosts.FindAsync(id);

            if (jobPost == null) return NotFound();
            if (jobPost.UserId != CurrentUserId) return Forbid();
            if (jobPost.Status != JobStatus.Open)
                return BadRequest(new { message = "Doar joburile cu status Open pot fi șterse. Folosește Anulare pentru a opri un job activ." });

            _context.JobPosts.Remove(jobPost);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool JobPostExists(long id)
        {
            return _context.JobPosts.Any(e => e.Id == id);
        }
    }
}
