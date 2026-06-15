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
    [Route("api/JobPosts/{jobPostId}/messages")]
    [ApiController]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly INotificationService _notifications;

        public MessagesController(TimeSaverContext context, INotificationService notifications)
        {
            _context       = context;
            _notifications = notifications;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/JobPosts/{jobPostId}/messages
        [HttpGet]
        public async Task<IActionResult> GetMessages(long jobPostId)
        {
            var job = await _context.JobPosts.FindAsync(jobPostId);
            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });

            if (!IsParticipant(job))
                return Forbid();

            var messages = await _context.Messages
                .Where(m => m.JobPostId == jobPostId)
                .Include(m => m.Sender)
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    id         = m.Id,
                    senderId   = m.SenderId,
                    senderName = m.Sender.Name,
                    content    = m.Content,
                    sentAt     = m.SentAt,
                    isRead     = m.IsRead
                })
                .ToListAsync();

            // Mark unread messages from the other party as read
            var unread = await _context.Messages
                .Where(m => m.JobPostId == jobPostId && !m.IsRead && m.SenderId != CurrentUserId)
                .ToListAsync();

            foreach (var m in unread) m.IsRead = true;
            if (unread.Count > 0) await _context.SaveChangesAsync();

            return Ok(messages);
        }

        // POST: api/JobPosts/{jobPostId}/messages
        [HttpPost]
        public async Task<IActionResult> SendMessage(long jobPostId, SendMessageDto dto)
        {
            var job = await _context.JobPosts.FindAsync(jobPostId);
            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });

            if (!IsParticipant(job))
                return BadRequest(new { message = "Poți trimite mesaje doar pentru joburile la care participi (angajator sau prestator acceptat)." });

            if (job.Status == JobStatus.Cancelled)
                return BadRequest(new { message = "Nu poți trimite mesaje pentru un job anulat." });

            var message = new Message
            {
                JobPostId = jobPostId,
                SenderId  = CurrentUserId,
                Content   = dto.Content.Trim(),
                SentAt    = DateTime.UtcNow,
                IsRead    = false
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            await _context.Entry(message).Reference(m => m.Sender).LoadAsync();

            // Notify the other participant
            long? recipientId = CurrentUserId == job.UserId
                ? job.AcceptedByUserId
                : (long?)job.UserId;

            if (recipientId.HasValue)
            {
                await _notifications.NotifyAsync(
                    userId:           recipientId.Value,
                    type:             NotificationType.NewMessage,
                    title:            "Mesaj nou",
                    message:          $"{message.Sender.Name} ti-a trimis un mesaj pentru jobul '{job.Title}'.",
                    relatedJobPostId: jobPostId);
            }

            return Ok(new
            {
                id         = message.Id,
                senderId   = message.SenderId,
                senderName = message.Sender.Name,
                content    = message.Content,
                sentAt     = message.SentAt,
                isRead     = message.IsRead
            });
        }

        private bool IsParticipant(JobPost job) =>
            job.UserId == CurrentUserId || job.AcceptedByUserId == CurrentUserId;
    }
}
