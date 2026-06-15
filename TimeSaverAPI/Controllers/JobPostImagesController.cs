using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TimeSaverAPI.Data;
using TimeSaverAPI.Models;

namespace TimeSaverAPI.Controllers
{
    [Route("api/JobPosts/{jobPostId}/images")]
    [ApiController]
    [Authorize]
    public class JobPostImagesController : ControllerBase
    {
        private const int MaxImagesPerJob = 10;
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        private static readonly string[] AllowedMimeTypes  = ["image/jpeg", "image/png", "image/webp", "image/gif"];

        private readonly TimeSaverContext _context;
        private readonly IWebHostEnvironment _env;

        public JobPostImagesController(TimeSaverContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env     = env;
        }

        private long CurrentUserId =>
            long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // GET: api/JobPosts/{jobPostId}/images
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetImages(long jobPostId)
        {
            var exists = await _context.JobPosts.AnyAsync(j => j.Id == jobPostId);
            if (!exists) return NotFound(new { message = "Jobul nu a fost găsit." });

            var images = await _context.JobPostImages
                .Where(i => i.JobPostId == jobPostId)
                .OrderByDescending(i => i.IsMain)
                .ThenBy(i => i.UploadedAt)
                .Select(i => new
                {
                    id         = i.Id,
                    imageUrl   = i.ImageUrl,
                    isMain     = i.IsMain,
                    uploadedAt = i.UploadedAt,
                    jobPostId  = i.JobPostId,
                })
                .ToListAsync();

            return Ok(images);
        }

        // POST: api/JobPosts/{jobPostId}/images
        [HttpPost]
        public async Task<IActionResult> UploadImage(long jobPostId, IFormFile file)
        {
            var job = await _context.JobPosts.FindAsync(jobPostId);
            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });
            if (job.UserId != CurrentUserId) return Forbid();

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Niciun fișier furnizat." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { message = "Fișierul depășește limita de 5 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { message = "Tip de fișier invalid. Sunt acceptate: jpg, jpeg, png, webp, gif." });

            if (!AllowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
                return BadRequest(new { message = "Tipul MIME al fișierului nu este acceptat." });

            var imageCount = await _context.JobPostImages.CountAsync(i => i.JobPostId == jobPostId);
            if (imageCount >= MaxImagesPerJob)
                return BadRequest(new { message = $"Un job poate avea maxim {MaxImagesPerJob} imagini." });

            // Save file to wwwroot/uploads/jobs/
            var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsDir  = Path.Combine(webRootPath, "uploads", "jobs");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var imageUrl = $"/uploads/jobs/{fileName}";
            var isFirst   = imageCount == 0;

            var image = new JobPostImage
            {
                JobPostId  = jobPostId,
                ImageUrl   = imageUrl,
                IsMain     = isFirst,
                UploadedAt = DateTime.UtcNow,
            };

            _context.JobPostImages.Add(image);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id         = image.Id,
                imageUrl   = image.ImageUrl,
                isMain     = image.IsMain,
                uploadedAt = image.UploadedAt,
                jobPostId  = image.JobPostId,
            });
        }

        // DELETE: api/JobPosts/{jobPostId}/images/{imageId}
        [HttpDelete("{imageId}")]
        public async Task<IActionResult> DeleteImage(long jobPostId, long imageId)
        {
            var job = await _context.JobPosts.FindAsync(jobPostId);
            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });
            if (job.UserId != CurrentUserId) return Forbid();

            var image = await _context.JobPostImages
                .FirstOrDefaultAsync(i => i.Id == imageId && i.JobPostId == jobPostId);

            if (image == null) return NotFound(new { message = "Imaginea nu a fost găsită." });

            bool wasMain = image.IsMain;

            // Delete physical file
            DeletePhysicalFile(image.ImageUrl);

            _context.JobPostImages.Remove(image);
            await _context.SaveChangesAsync();

            // If deleted image was main, promote the oldest remaining image
            if (wasMain)
            {
                var next = await _context.JobPostImages
                    .Where(i => i.JobPostId == jobPostId)
                    .OrderBy(i => i.UploadedAt)
                    .FirstOrDefaultAsync();

                if (next != null)
                {
                    next.IsMain = true;
                    await _context.SaveChangesAsync();
                }
            }

            return NoContent();
        }

        // PUT: api/JobPosts/{jobPostId}/images/{imageId}/main
        [HttpPut("{imageId}/main")]
        public async Task<IActionResult> SetMainImage(long jobPostId, long imageId)
        {
            var job = await _context.JobPosts.FindAsync(jobPostId);
            if (job == null) return NotFound(new { message = "Jobul nu a fost găsit." });
            if (job.UserId != CurrentUserId) return Forbid();

            var images = await _context.JobPostImages
                .Where(i => i.JobPostId == jobPostId)
                .ToListAsync();

            var target = images.FirstOrDefault(i => i.Id == imageId);
            if (target == null) return NotFound(new { message = "Imaginea nu a fost găsită." });

            foreach (var img in images)
                img.IsMain = img.Id == imageId;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Imaginea principală a fost actualizată." });
        }

        private void DeletePhysicalFile(string imageUrl)
        {
            try
            {
                var webRootPath  = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                var relativePath = imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                var fullPath     = Path.Combine(webRootPath, relativePath);
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }
            catch
            {
                // Best-effort file cleanup
            }
        }
    }
}
