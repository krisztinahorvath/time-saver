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
    public class JobApplicationsController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly INotificationService _notifications;

        public JobApplicationsController(TimeSaverContext context, INotificationService notifications)
        {
            _context       = context;
            _notifications = notifications;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/JobApplications
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

            if (jobApplication.UserId != CurrentUserId &&
                jobApplication.JobPost.UserId != CurrentUserId)
                return Forbid();

            return jobApplication;
        }

        // POST: api/JobApplications
        [HttpPost]
        public async Task<ActionResult<JobApplication>> PostJobApplication(CreateJobApplicationDto dto)
        {
            var jobPost = await _context.JobPosts.FindAsync(dto.JobPostId);
            if (jobPost == null) return NotFound("Job post not found.");
            if (jobPost.Status != JobStatus.Open)
                return BadRequest("You can only apply to Open jobs.");
            if (jobPost.UserId == CurrentUserId)
                return BadRequest("You cannot apply to your own job.");

            bool alreadyApplied = await _context.JobApplications
                .AnyAsync(a => a.JobPostId == dto.JobPostId && a.UserId == CurrentUserId);
            if (alreadyApplied)
                return BadRequest("You have already applied to this job.");

            var applicant     = await _context.Users.FindAsync(CurrentUserId);
            var applicantName = applicant?.Name ?? "Un utilizator";

            var jobApplication = new JobApplication
            {
                Message              = dto.Message,
                JobPostId            = dto.JobPostId,
                JobApplicationStatus = JobApplicationStatus.Pending,
                CreatedAt            = DateTime.UtcNow,
                UserId               = CurrentUserId
            };

            _context.JobApplications.Add(jobApplication);
            await _context.SaveChangesAsync();

            // Notify employer
            await _notifications.NotifyAsync(
                userId:           jobPost.UserId,
                type:             NotificationType.NewApplication,
                title:            "Aplicatie noua",
                message:          $"{applicantName} a aplicat la jobul '{jobPost.Title}'.",
                relatedJobPostId: jobPost.Id);

            return CreatedAtAction(nameof(GetJobApplication), new { id = jobApplication.Id }, jobApplication);
        }

        // DELETE: api/JobApplications/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJobApplication(long id)
        {
            var jobApplication = await _context.JobApplications.FindAsync(id);

            if (jobApplication == null) return NotFound();
            if (jobApplication.UserId != CurrentUserId) return Forbid();
            if (jobApplication.JobApplicationStatus != JobApplicationStatus.Pending)
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
