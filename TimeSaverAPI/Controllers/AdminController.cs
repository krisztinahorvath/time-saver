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
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly IAuditService _audit;

        public AdminController(TimeSaverContext context, IAuditService audit)
        {
            _context = context;
            _audit   = audit;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/Admin/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalUsers     = await _context.Users.CountAsync();
            var totalJobs      = await _context.JobPosts.CountAsync();
            var openJobs       = await _context.JobPosts.CountAsync(j => j.Status == JobStatus.Open);
            var completedJobs  = await _context.JobPosts.CountAsync(j => j.Status == JobStatus.Completed);
            var totalReviews   = await _context.Reviews.CountAsync();
            var openReports    = await _context.Reports.CountAsync(r => r.Status == ReportStatus.Open);
            var suspendedUsers = await _context.Users.CountAsync(u => u.IsSuspended);
            var totalMessages  = await _context.Messages.CountAsync();

            var recentUsers = await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .Select(u => new { u.Id, u.Name, u.Email, u.UserType, u.CreatedAt, u.IsSuspended })
                .ToListAsync();

            var recentJobs = await _context.JobPosts
                .Include(j => j.User)
                .OrderByDescending(j => j.CreatedAt)
                .Take(5)
                .Select(j => new { j.Id, j.Title, j.Status, j.Budget, j.CreatedAt, userName = j.User!.Name })
                .ToListAsync();

            return Ok(new
            {
                totalUsers,
                suspendedUsers,
                totalJobs,
                openJobs,
                completedJobs,
                totalReviews,
                openReports,
                totalMessages,
                recentUsers,
                recentJobs,
            });
        }

        // GET: api/Admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? keyword,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(u => u.Name.Contains(keyword) || u.Email.Contains(keyword));

            var totalCount = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.UserType,
                    u.IsSuspended,
                    u.CreatedAt,
                    jobCount    = _context.JobPosts.Count(j => j.UserId == u.Id),
                    reviewCount = _context.Reviews.Count(r => r.ReviewedUserId == u.Id),
                })
                .ToListAsync();

            return Ok(new PagedResult<object>
            {
                Items      = users.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
            });
        }

        // PUT: api/Admin/users/{id}/suspend
        [HttpPut("users/{id}/suspend")]
        public async Task<IActionResult> SuspendUser(long id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Utilizatorul nu a fost găsit." });
            if (user.UserType == UserType.Admin)
                return BadRequest(new { message = "Nu poți suspenda un alt administrator." });

            user.IsSuspended = true;

            // Revoke all refresh tokens so suspended user cannot renew session
            var tokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == id && !rt.IsRevoked)
                .ToListAsync();
            foreach (var t in tokens) t.IsRevoked = true;

            await _context.SaveChangesAsync();
            await _audit.LogAsync(CurrentUserId, "SuspendUser", "User", id, $"User {user.Email} suspended");

            return Ok(new { message = "Utilizatorul a fost suspendat." });
        }

        // PUT: api/Admin/users/{id}/unsuspend
        [HttpPut("users/{id}/unsuspend")]
        public async Task<IActionResult> UnsuspendUser(long id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Utilizatorul nu a fost găsit." });

            user.IsSuspended = false;
            await _context.SaveChangesAsync();
            await _audit.LogAsync(CurrentUserId, "UnsuspendUser", "User", id, $"User {user.Email} unsuspended");

            return Ok(new { message = "Utilizatorul a fost reactivat." });
        }

        // GET: api/Admin/jobs
        [HttpGet("jobs")]
        public async Task<IActionResult> GetJobs(
            [FromQuery] string? keyword,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var query = _context.JobPosts.Include(j => j.User).AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(j => j.Title.Contains(keyword) || j.Description.Contains(keyword));

            var totalCount = await query.CountAsync();

            var jobs = await query
                .OrderByDescending(j => j.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(j => new
                {
                    j.Id, j.Title, j.Budget, j.Status, j.Category,
                    j.Location, j.CreatedAt,
                    userId   = j.UserId,
                    userName = j.User != null ? j.User.Name : null,
                })
                .ToListAsync();

            return Ok(new PagedResult<object>
            {
                Items      = jobs.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
            });
        }

        // DELETE: api/Admin/jobs/{id}
        [HttpDelete("jobs/{id}")]
        public async Task<IActionResult> DeleteJob(long id)
        {
            var job = await _context.JobPosts.FindAsync(id);
            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });

            _context.JobPosts.Remove(job);
            await _context.SaveChangesAsync();
            await _audit.LogAsync(CurrentUserId, "AdminDeleteJob", "JobPost", id, $"Job '{job.Title}' deleted by admin");

            return NoContent();
        }

        // GET: api/Admin/reports
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var query = _context.Reports
                .Include(r => r.ReporterUser)
                .Include(r => r.ReportedUser)
                .Include(r => r.ReportedJobPost)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReportStatus>(status, out var parsedStatus))
                query = query.Where(r => r.Status == parsedStatus);

            var totalCount = await query.CountAsync();

            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.Id, r.Type, r.Status, r.Reason, r.CreatedAt, r.ResolvedAt, r.AdminNote,
                    reporterName    = r.ReporterUser.Name,
                    reporterEmail   = r.ReporterUser.Email,
                    reportedUserId  = r.ReportedUserId,
                    reportedUserName = r.ReportedUser != null ? r.ReportedUser.Name : null,
                    reportedJobPostId = r.ReportedJobPostId,
                    reportedJobTitle = r.ReportedJobPost != null ? r.ReportedJobPost.Title : null,
                    reportedReviewId = r.ReportedReviewId,
                })
                .ToListAsync();

            return Ok(new PagedResult<object>
            {
                Items      = reports.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
            });
        }

        // PUT: api/Admin/reports/{id}/status
        [HttpPut("reports/{id}/status")]
        public async Task<IActionResult> UpdateReportStatus(long id, AdminUpdateReportDto dto)
        {
            if (!Enum.TryParse<ReportStatus>(dto.Status, out var newStatus))
                return BadRequest(new { message = "Status invalid." });

            var report = await _context.Reports.FindAsync(id);
            if (report == null) return NotFound(new { message = "Raportul nu a fost găsit." });

            report.Status    = newStatus;
            report.AdminNote = dto.AdminNote;
            if (newStatus is ReportStatus.Resolved or ReportStatus.Rejected)
                report.ResolvedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Statusul raportului a fost actualizat." });
        }

        // GET: api/Admin/audit
        [HttpGet("audit")]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var query = _context.AuditLogs
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp);

            var totalCount = await query.CountAsync();

            var logs = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id, a.Action, a.EntityType, a.EntityId, a.Details, a.Timestamp,
                    userName = a.User != null ? a.User.Name : null,
                })
                .ToListAsync();

            return Ok(new PagedResult<object>
            {
                Items      = logs.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
            });
        }
    }
}
