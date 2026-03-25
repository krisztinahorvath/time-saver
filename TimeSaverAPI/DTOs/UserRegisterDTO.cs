using TimeSaverAPI.Models;

namespace TimeSaverAPI.DTOs
{
    public class UserRegisterDTO
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Bio { get; set; } = null!;
        public UserType UserType { get; set; }
    }
}
