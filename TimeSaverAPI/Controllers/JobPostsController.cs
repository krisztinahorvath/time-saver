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
        public async Task<ActionResult<IEnumerable<JobPost>>> GetJobPosts()
        {
            return await _context.JobPosts
                .Include(j => j.User)
                .Include(j => j.Images)
                .Where(j => j.Status == JobStatus.Open)
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
                Status = JobStatus.Open,
                CreatedAt = DateTime.UtcNow,
                UserId = CurrentUserId          // taken from JWT, not from client
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
            if (jobPost.UserId != CurrentUserId) return Forbid(); // only the poster

            var application = jobPost.JobApplications
                .FirstOrDefault(a => a.Id == dto.ApplicationId);

            if (application == null) return NotFound("Application not found.");

            // accept the chosen one, reject the rest
            foreach (var app in jobPost.JobApplications)
            {
                app.JobApllicationStatus = app.Id == dto.ApplicationId
                    ? JobApplicationStatus.Accepted
                    : JobApplicationStatus.Rejected;
            }

            jobPost.Status = JobStatus.InProgress;
            jobPost.AcceptedByUserId = application.UserId;

            await _context.SaveChangesAsync();
            return Ok(jobPost);
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
                return BadRequest("Cannot delete a job that is already in progress.");

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