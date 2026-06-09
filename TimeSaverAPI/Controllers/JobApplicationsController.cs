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
    public class JobApplicationsController : ControllerBase
    {
        private readonly TimeSaverContext _context;

        public JobApplicationsController(TimeSaverContext context)
        {
            _context = context;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/JobApplications
        // Only returns applications belonging to the logged in user
        [HttpGet]
        public async Task<ActionResult<IEnumerable<JobApplication>>> GetJobApplications()
        {
            return await _context.JobApplications
                .Include(a => a.JobPost)
                .Where(a => a.UserId == CurrentUserId)
                .ToListAsync();
        }

        // GET: api/JobApplications/5
        [HttpGet("{id}")]
        public async Task<ActionResult<JobApplication>> GetJobApplication(long id)
        {
            var jobApplication = await _context.JobApplications
                .Include(a => a.JobPost)
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (jobApplication == null) return NotFound();

            // only the applicant or the job poster can see it
            if (jobApplication.UserId != CurrentUserId &&
                jobApplication.JobPost.UserId != CurrentUserId)
                return Forbid();

            return jobApplication;
        }

        // POST: api/JobApplications
        [HttpPost]
        public async Task<ActionResult<JobApplication>> PostJobApplication(CreateJobApplicationDto dto)
        {
            // make sure the job exists and is Open
            var jobPost = await _context.JobPosts.FindAsync(dto.JobPostId);
            if (jobPost == null) return NotFound("Job post not found.");
            if (jobPost.Status != JobStatus.Open)
                return BadRequest("You can only apply to Open jobs.");
            if (jobPost.UserId == CurrentUserId)
                return BadRequest("You cannot apply to your own job.");

            var jobApplication = new JobApplication
            {
                Message = dto.Message,
                JobPostId = dto.JobPostId,
                JobApllicationStatus = JobApplicationStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UserId = CurrentUserId
            };

            _context.JobApplications.Add(jobApplication);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetJobApplication), new { id = jobApplication.Id }, jobApplication);
        }

        // DELETE: api/JobApplications/5
        // Only the applicant can withdraw, and only if still Pending
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJobApplication(long id)
        {
            var jobApplication = await _context.JobApplications.FindAsync(id);

            if (jobApplication == null) return NotFound();
            if (jobApplication.UserId != CurrentUserId) return Forbid();
            if (jobApplication.JobApllicationStatus != JobApplicationStatus.Pending)
                return BadRequest("You can only withdraw a Pending application.");

            _context.JobApplications.Remove(jobApplication);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool JobApplicationExists(long id)
        {
            return _context.JobApplications.Any(e => e.Id == id);
        }
    }
}