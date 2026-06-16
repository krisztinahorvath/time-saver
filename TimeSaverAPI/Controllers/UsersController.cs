using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
        private readonly IPasswordHasher<User> _passwordHasher;

        public UsersController(
            TimeSaverContext context,
            IOptions<JwtSettings> jwtSettings,
            IPasswordHasher<User> passwordHasher)
        {
            _context        = context;
            _jwtSettings    = jwtSettings.Value;
            _passwordHasher = passwordHasher;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // POST: api/Users/Register
        [AllowAnonymous]
        [HttpPost("Register")]
        public async Task<IActionResult> Register(UserRegisterDTO dto)
        {
            if (dto.UserType == UserType.Admin)
                return BadRequest(new { message = "Înregistrarea publică cu tipul Admin nu este permisă." });

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Adresa de email este deja folosită." });

            var user = new User
            {
                Name      = dto.Name,
                Email     = dto.Email,
                Bio       = dto.Bio ?? string.Empty,
                UserType  = dto.UserType,
                CreatedAt = DateTime.UtcNow,
            };

            user.Password = _passwordHasher.HashPassword(user, dto.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cont creat cu succes." });
        }

        // POST: api/Users/Login  — protected by rate limiting (5/min per IP)
        [AllowAnonymous]
        [EnableRateLimiting("login-protection")]
        [HttpPost("Login")]
        public async Task<IActionResult> Login(UserLoginDTO dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return Unauthorized(new { message = "Email sau parolă incorectă." });

            var verifyResult = VerifyPassword(user, dto.Password);

            if (verifyResult == PasswordVerificationResult.Failed)
                return Unauthorized(new { message = "Email sau parolă incorectă." });

            if (user.IsSuspended)
                return StatusCode(403, new { message = "Contul tău a fost suspendat. Contactează echipa de suport." });

            // Transparent upgrade: old SHA-256 hash → new PBKDF2 hash on next login
            if (verifyResult == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.Password = _passwordHasher.HashPassword(user, dto.Password);
                await _context.SaveChangesAsync();
            }

            var accessToken   = GenerateAccessToken(user);
            var (rawRefresh, hashRefresh) = GenerateRefreshToken();

            _context.RefreshTokens.Add(new RefreshToken
            {
                UserId    = user.Id,
                TokenHash = hashRefresh,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();

            return Ok(new
            {
                token        = accessToken,   // backward-compat alias
                accessToken,
                refreshToken = rawRefresh,
                userId       = user.Id,
                name         = user.Name,
                userType     = user.UserType.ToString(),
            });
        }

        // POST: api/Users/refresh
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(RefreshTokenDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return Unauthorized(new { message = "Refresh token lipsă." });

            var hash  = HashToken(dto.RefreshToken);
            var token = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.TokenHash == hash);

            if (token == null || token.IsRevoked || token.ExpiresAt <= DateTime.UtcNow)
                return Unauthorized(new { message = "Refresh token invalid sau expirat. Autentifică-te din nou." });

            if (token.User.IsSuspended)
                return StatusCode(403, new { message = "Contul a fost suspendat." });

            // Rotate: revoke old, issue new
            token.IsRevoked = true;

            var accessToken   = GenerateAccessToken(token.User);
            var (rawRefresh, hashRefresh) = GenerateRefreshToken();

            _context.RefreshTokens.Add(new RefreshToken
            {
                UserId    = token.UserId,
                TokenHash = hashRefresh,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                accessToken,
                refreshToken = rawRefresh,
            });
        }

        // POST: api/Users/logout
        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(RefreshTokenDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return NoContent();

            var hash  = HashToken(dto.RefreshToken);
            var token = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == hash);

            if (token != null && !token.IsRevoked)
            {
                token.IsRevoked = true;
                await _context.SaveChangesAsync();
            }

            return NoContent();
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
                id            = user.Id,
                name          = user.Name,
                email         = user.Email,
                bio           = user.Bio,
                userType      = user.UserType.ToString(),
                averageRating = avgRating,
                reviewCount   = user.ReceivedReviews?.Count ?? 0,
            });
        }

        // PUT: api/Users/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe(UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name.Trim();

            if (dto.Bio != null)
                user.Bio = dto.Bio.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id       = user.Id,
                name     = user.Name,
                email    = user.Email,
                bio      = user.Bio,
                userType = user.UserType.ToString(),
            });
        }

        // GET: api/Users/{id}/public-profile
        [AllowAnonymous]
        [HttpGet("{id}/public-profile")]
        public async Task<IActionResult> GetPublicProfile(long id)
        {
            var user = await _context.Users
                .Include(u => u.ReceivedReviews!)
                    .ThenInclude(r => r.ReviewerUser)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return NotFound(new { message = "Utilizatorul nu a fost găsit." });

            double avgRating = user.ReceivedReviews != null && user.ReceivedReviews.Count > 0
                ? Math.Round(user.ReceivedReviews.Average(r => r.Rating), 2)
                : 0;

            int completedJobsCount = user.UserType == UserType.Worker
                ? await _context.JobPosts.CountAsync(j => j.AcceptedByUserId == id && j.Status == JobStatus.Completed)
                : await _context.JobPosts.CountAsync(j => j.UserId == id && j.Status == JobStatus.Completed);

            var reviews = user.ReceivedReviews?
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id             = r.Id,
                    rating         = r.Rating,
                    comment        = r.Comment,
                    createdAt      = r.CreatedAt,
                    reviewerUserId = r.ReviewerUserId,
                    reviewerName   = r.ReviewerUser?.Name,
                })
                .ToList();

            return Ok(new
            {
                id                 = user.Id,
                name               = user.Name,
                bio                = user.Bio,
                userType           = user.UserType.ToString(),
                isSuspended        = user.IsSuspended,
                averageRating      = avgRating,
                reviewCount        = user.ReceivedReviews?.Count ?? 0,
                completedJobsCount,
                memberSince        = user.CreatedAt,
                reviews,
            });
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            return await _context.Users
                .Select(u => new
                {
                    id       = u.Id,
                    name     = u.Name,
                    email    = u.Email,
                    userType = u.UserType.ToString(),
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

        // ── Private helpers ──────────────────────────────────────────────────

        private PasswordVerificationResult VerifyPassword(User user, string providedPassword)
        {
            var result = _passwordHasher.VerifyHashedPassword(user, user.Password, providedPassword);
            if (result != PasswordVerificationResult.Failed)
                return result;

            // Fallback: legacy SHA-256 (pre-Phase1 accounts)
            if (user.Password == ComputeLegacySha256(providedPassword))
                return PasswordVerificationResult.SuccessRehashNeeded;

            return PasswordVerificationResult.Failed;
        }

        private static string ComputeLegacySha256(string password)
        {
            byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            return BitConverter.ToString(bytes).Replace("-", "").ToLower();
        }

        private string GenerateAccessToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.UserType.ToString()),
            };

            var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                claims:              claims,
                expires:             DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                signingCredentials:  credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static (string raw, string hash) GenerateRefreshToken()
        {
            var raw  = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var hash = HashToken(raw);
            return (raw, hash);
        }

        private static string HashToken(string token)
        {
            byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes);
        }
    }
}
