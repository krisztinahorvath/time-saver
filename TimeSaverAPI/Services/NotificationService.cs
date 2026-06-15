using TimeSaverAPI.Data;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Services
{
    public class NotificationService : INotificationService
    {
        private readonly TimeSaverContext _context;

        public NotificationService(TimeSaverContext context)
        {
            _context = context;
        }

        public async Task NotifyAsync(long userId, NotificationType type, string title, string message, long? relatedJobPostId = null)
        {
            try
            {
                _context.Notifications.Add(new Notification
                {
                    UserId           = userId,
                    Type             = type,
                    Title            = title,
                    Message          = message,
                    RelatedJobPostId = relatedJobPostId,
                    IsRead           = false,
                    CreatedAt        = DateTime.UtcNow,
                });
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Notifications are best-effort; never fail the main operation
            }
        }
    }
}
