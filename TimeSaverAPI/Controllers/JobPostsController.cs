using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.DTOs;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class JobPostsController : ControllerBase
    {
        private readonly TimeSaverContext _context;

        public JobPostsController(TimeSaverContext context)
        {
            _context = context;
        }

        // helper — reads the user ID baked into the JWT token
        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/JobPosts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<JobPost>>> GetJobPosts(
            [FromQuery] JobCategory? category,
            [FromQuery] string? location,
            [FromQuery] double? minPrice,
            [FromQuery] double? maxPrice)
        {
            var query = _context.JobPosts
                .Include(j => j.User)
                .Include(j => j.Images)
                .Where(j => j.Status == JobStatus.Open);

            if (category.HasValue)
                query = query.Where(j => j.Category == category.Value);

            if (!string.IsNullOrWhiteSpace(location))
                query = query.Where(j => j.Location.Contains(location));

            if (minPrice.HasValue)
                query = query.Where(j => j.Budget >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(j => j.Budget <= maxPrice.Value);

            return await query.ToListAsync();
        }

        // GET: api/JobPosts/mine
        [HttpGet("mine")]
        public async Task<ActionResult<IEnumerable<JobPost>>> GetMyJobPosts()
        {
            return await _context.JobPosts
                .Include(j => j.Images)
                .Include(j => j.JobApplications)
                    .ThenInclude(a => a.User)
                .Where(j => j.UserId == CurrentUserId)
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
                    .ThenInclude(a => a.User)   // who applied
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
                Title = dto.Title,
                Description = dto.Description,
                Budget = dto.Budget,
                Category = dto.Category!.Value,
                Location = dto.Location,
                Deadline = dto.Deadline,
                SpecialRequirements = dto.SpecialRequirements,
                Status = JobStatus.Open,
                CreatedAt = DateTime.UtcNow,
                UserId = CurrentUserId
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

            // accept the chosen one, reject the rest
            foreach (var app in jobPost.JobApplications)
            {
                app.JobApplicationStatus = app.Id == dto.ApplicationId
                    ? JobApplicationStatus.Accepted
                    : JobApplicationStatus.Rejected;
            }

            jobPost.Status = JobStatus.InProgress;
            jobPost.AcceptedByUserId = application.UserId;

            await _context.SaveChangesAsync();
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

            // auto-reject all pending applications
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
                return BadRequest("Job must be InProgress to be completed.");

            jobPost.Status = JobStatus.Completed;
            await _context.SaveChangesAsync();

            return Ok(jobPost);
        }

        // DELETE: api/JobPosts/5
        // Only the original poster can delete, and only if it hasn't started
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