using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.DTOs;

namespace TimeSaverAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly TimeSaverContext _context;

        public NotificationsController(TimeSaverContext context)
        {
            _context = context;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page     = Math.Max(1, page);

            var query = _context.Notifications
                .Where(n => n.UserId == CurrentUserId)
                .OrderByDescending(n => n.CreatedAt);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NotificationDto
                {
                    Id               = n.Id,
                    Type             = n.Type.ToString(),
                    Title            = n.Title,
                    Message          = n.Message,
                    RelatedJobPostId = n.RelatedJobPostId,
                    IsRead           = n.IsRead,
                    CreatedAt        = n.CreatedAt,
                })
                .ToListAsync();

            return Ok(new PagedResult<NotificationDto>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize,
            });
        }

        // GET: api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var count = await _context.Notifications
                .CountAsync(n => n.UserId == CurrentUserId && !n.IsRead);

            return Ok(new { count });
        }

        // PUT: api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(long id)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == CurrentUserId);

            if (notification == null) return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PUT: api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var unread = await _context.Notifications
                .Where(n => n.UserId == CurrentUserId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread) n.IsRead = true;
            if (unread.Count > 0) await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
