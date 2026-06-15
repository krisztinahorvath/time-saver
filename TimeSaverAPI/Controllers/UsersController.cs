using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TimeSaverAPI.Data;
using TimeSaverAPI.DTOs;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly TimeSaverContext _context;
        private readonly JwtSettings _jwtSettings;

        public UsersController(TimeSaverContext context, IOptions<JwtSettings> jwtSettings)
        {
            _context = context;
            _jwtSettings = jwtSettings.Value;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // POST: api/Users/Register
        [AllowAnonymous]
        [HttpPost("Register")]
        public async Task<IActionResult> Register(UserRegisterDTO dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email is already in use." });

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                Password = HashPassword(dto.Password),
                Bio = dto.Bio ?? string.Empty,
                UserType = dto.UserType
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful." });
        }

        // POST: api/Users/Login
        [AllowAnonymous]
        [HttpPost("Login")]
        public async Task<IActionResult> Login(UserLoginDTO dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Password == HashPassword(dto.Password));

            if (user == null)
                return Unauthorized(new { message = "Invalid email or password." });

            string token = GenerateJwtToken(user);

            return Ok(new
            {
                token,
                userId = user.Id,
                name = user.Name,
                userType = user.UserType.ToString()
            });
        }

        // GET: api/Users/me
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var user = await _context.Users
                .Include(u => u.ReceivedReviews)
                .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

            if (user == null) return NotFound();

            double avgRating = user.ReceivedReviews != null && user.ReceivedReviews.Count > 0
                ? Math.Round(user.ReceivedReviews.Average(r => r.Rating), 2)
                : 0;

            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                bio = user.Bio,
                userType = user.UserType.ToString(),
                averageRating = avgRating,
                reviewCount = user.ReceivedReviews?.Count ?? 0
            });
        }

        // PUT: api/Users/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe(UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name;

            if (!string.IsNullOrWhiteSpace(dto.Bio))
                user.Bio = dto.Bio;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                bio = user.Bio,
                userType = user.UserType.ToString()
            });
        }

        // GET: api/Users/{id}/public-profile
        [HttpGet("{id}/public-profile")]
        public async Task<IActionResult> GetPublicProfile(long id)
        {
            var user = await _context.Users
                .Include(u => u.ReceivedReviews!)
                    .ThenInclude(r => r.ReviewerUser)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return NotFound();

            double avgRating = user.ReceivedReviews != null && user.ReceivedReviews.Count > 0
                ? Math.Round(user.ReceivedReviews.Average(r => r.Rating), 2)
                : 0;

            var reviews = user.ReceivedReviews?
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id = r.Id,
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt,
                    reviewerName = r.ReviewerUser?.Name
                })
                .ToList();

            return Ok(new
            {
                id = user.Id,
                name = user.Name,
                bio = user.Bio,
                userType = user.UserType.ToString(),
                averageRating = avgRating,
                reviewCount = user.ReceivedReviews?.Count ?? 0,
                reviews
            });
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            return await _context.Users
                .Select(u => new
                {
                    id = u.Id,
                    name = u.Name,
                    email = u.Email,
                    userType = u.UserType.ToString()
                })
                .ToListAsync<object>();
        }

        // DELETE: api/Users/{id}
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(long id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.UserType.ToString()),
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(120),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string HashPassword(string password)
        {
            byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            return BitConverter.ToString(bytes).Replace("-", "").ToLower();
        }
    }
}
