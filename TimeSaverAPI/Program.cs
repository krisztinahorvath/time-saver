using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Converters;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;
using TimeSaverAPI.Data;
using TimeSaverAPI.DTOs;
using TimeSaverAPI.Middleware;
using TimeSaverAPI.Models;
using TimeSaverAPI.Services;

namespace TimeSaverAPI
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ── Serilog ───────────────────────────────────────────────────────
            // Sinks and levels are fully configured in appsettings.json (Serilog section).
            // Do not add extra sinks here — that would cause duplicate log entries.
            builder.Host.UseSerilog((ctx, lc) => lc
                .ReadFrom.Configuration(ctx.Configuration)
                .Enrich.FromLogContext());

            // ── Rate Limiting ─────────────────────────────────────────────────
            builder.Services.AddRateLimiter(options =>
            {
                options.AddFixedWindowLimiter("login-protection", o =>
                {
                    o.Window               = TimeSpan.FromMinutes(1);
                    o.PermitLimit          = 5;
                    o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    o.QueueLimit           = 0;
                });
                options.RejectionStatusCode = 429;
                options.OnRejected = async (ctx, _) =>
                {
                    ctx.HttpContext.Response.ContentType = "application/json";
                    await ctx.HttpContext.Response.WriteAsJsonAsync(
                        new { message = "Prea multe încercări de autentificare. Încearcă din nou peste un minut." });
                };
            });

            // ── MVC + JSON ────────────────────────────────────────────────────
            builder.Services.AddControllers(options =>
            {
                var policy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .Build();
                options.Filters.Add(new AuthorizeFilter(policy));
            })
            .AddNewtonsoftJson(options =>
            {
                options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
                options.SerializerSettings.Converters.Add(new StringEnumConverter());
            });

            // ── JWT ───────────────────────────────────────────────────────────
            var jwtSettingsSection = builder.Configuration.GetSection("JwtSettings");
            builder.Services.Configure<JwtSettings>(jwtSettingsSection);
            var jwtSettings = jwtSettingsSection.Get<JwtSettings>();

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings!.Secret)),
                    ValidateIssuer           = false,
                    ValidateAudience         = false,
                    ValidateLifetime         = true,
                    ClockSkew                = TimeSpan.Zero,
                };
            });

            // ── DI Services ───────────────────────────────────────────────────
            builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<IEmailService, NoOpEmailService>();
            builder.Services.AddScoped<IAuditService, AuditService>();

            // ── Validation ────────────────────────────────────────────────────
            builder.Services.AddFluentValidationAutoValidation();
            builder.Services.AddValidatorsFromAssemblyContaining<UserRegisterDTO>();

            // ── Swagger ───────────────────────────────────────────────────────
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.ConfigureSwaggerGen(setup =>
            {
                setup.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
                {
                    Title   = "TimeSaverAPI",
                    Version = "v1",
                });
            });

            // ── Database ──────────────────────────────────────────────────────
            builder.Services.AddDbContext<TimeSaverContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // ── CORS ──────────────────────────────────────────────────────────
            var allowedOrigins = builder.Configuration
                .GetSection("AllowedOrigins")
                .Get<string[]>()
                ?? ["http://localhost:5173", "https://localhost:5173"];

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AppPolicy", policy =>
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyMethod()
                          .AllowAnyHeader());
            });

            // ─────────────────────────────────────────────────────────────────
            var app = builder.Build();

            // ── Global exception handler ──────────────────────────────────────
            app.UseMiddleware<ExceptionMiddleware>();

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseCors("AppPolicy");

            // Allow Stripe webhook to read raw request body before any framework buffering
            app.Use(async (ctx, next) =>
            {
                if (ctx.Request.Path.StartsWithSegments("/api/stripe/webhook"))
                    ctx.Request.EnableBuffering();
                await next();
            });

            app.UseStaticFiles();
            app.UseRateLimiter();
            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();

            // ── Dev admin seed ────────────────────────────────────────────────
            if (app.Environment.IsDevelopment())
                await AdminSeeder.SeedAsync(app.Services, app.Configuration, app.Logger);

            app.Run();
        }
    }
}
