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
    public class ReportsController : ControllerBase
    {
        private readonly TimeSaverContext _context;

        public ReportsController(TimeSaverContext context)
        {
            _context = context;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // POST: api/Reports
        [HttpPost]
        public async Task<IActionResult> CreateReport(CreateReportDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Reason) || dto.Reason.Trim().Length < 10)
                return BadRequest(new { message = "Motivul raportului trebuie să aibă cel puțin 10 caractere." });

            if (!Enum.TryParse<ReportType>(dto.Type, out var reportType))
                return BadRequest(new { message = "Tipul raportului este invalid. Valori acceptate: User, Review, Job." });

            // Validate that the target exists and corresponds to the type
            switch (reportType)
            {
                case ReportType.User:
                    if (!dto.ReportedUserId.HasValue)
                        return BadRequest(new { message = "ReportedUserId este obligatoriu pentru raportarea unui utilizator." });
                    if (dto.ReportedUserId.Value == CurrentUserId)
                        return BadRequest(new { message = "Nu poți raporta propriul cont." });
                    if (!await _context.Users.AnyAsync(u => u.Id == dto.ReportedUserId.Value))
                        return NotFound(new { message = "Utilizatorul raportat nu a fost găsit." });
                    break;

                case ReportType.Review:
                    if (!dto.ReportedReviewId.HasValue)
                        return BadRequest(new { message = "ReportedReviewId este obligatoriu pentru raportarea unei recenzii." });
                    if (!await _context.Reviews.AnyAsync(r => r.Id == dto.ReportedReviewId.Value))
                        return NotFound(new { message = "Recenzia raportată nu a fost găsită." });
                    break;

                case ReportType.Job:
                    if (!dto.ReportedJobPostId.HasValue)
                        return BadRequest(new { message = "ReportedJobPostId este obligatoriu pentru raportarea unui job." });
                    if (!await _context.JobPosts.AnyAsync(j => j.Id == dto.ReportedJobPostId.Value))
                        return NotFound(new { message = "Jobul raportat nu a fost găsit." });
                    break;
            }

            // Prevent duplicate open reports from same user for same target
            bool duplicate = reportType switch
            {
                ReportType.User   => await _context.Reports.AnyAsync(r =>
                    r.ReporterUserId == CurrentUserId &&
                    r.ReportedUserId == dto.ReportedUserId &&
                    r.Status == ReportStatus.Open),
                ReportType.Review => await _context.Reports.AnyAsync(r =>
                    r.ReporterUserId == CurrentUserId &&
                    r.ReportedReviewId == dto.ReportedReviewId &&
                    r.Status == ReportStatus.Open),
                ReportType.Job    => await _context.Reports.AnyAsync(r =>
                    r.ReporterUserId == CurrentUserId &&
                    r.ReportedJobPostId == dto.ReportedJobPostId &&
                    r.Status == ReportStatus.Open),
                _                 => false,
            };

            if (duplicate)
                return BadRequest(new { message = "Ai deja un raport deschis pentru această entitate." });

            var report = new Report
            {
                ReporterUserId    = CurrentUserId,
                Type              = reportType,
                Status            = ReportStatus.Open,
                Reason            = dto.Reason.Trim(),
                ReportedUserId    = dto.ReportedUserId,
                ReportedReviewId  = dto.ReportedReviewId,
                ReportedJobPostId = dto.ReportedJobPostId,
                CreatedAt         = DateTime.UtcNow,
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Raportul a fost trimis și va fi revizuit de echipa noastră.", id = report.Id });
        }

        // GET: api/Reports/mine
        [HttpGet("mine")]
        public async Task<IActionResult> GetMyReports()
        {
            var reports = await _context.Reports
                .Where(r => r.ReporterUserId == CurrentUserId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id, r.Type, r.Status, r.Reason, r.CreatedAt, r.AdminNote,
                    r.ReportedUserId, r.ReportedReviewId, r.ReportedJobPostId,
                })
                .ToListAsync();

            return Ok(reports);
        }
    }
}
