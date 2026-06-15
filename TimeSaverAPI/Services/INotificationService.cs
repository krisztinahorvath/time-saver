using TimeSaverAPI.Models;

namespace TimeSaverAPI.Services
{
    public interface INotificationService
    {
        Task NotifyAsync(long userId, NotificationType type, string title, string message, long? relatedJobPostId = null);
    }
}
