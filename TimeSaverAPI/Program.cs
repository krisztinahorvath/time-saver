using Microsoft.EntityFrameworkCore;
using TimeSaverAPI.Data;

namespace TimeSaverAPI 
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // This will use the property names as defined in the C# model
                    options.JsonSerializerOptions.PropertyNamingPolicy = null;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.ConfigureSwaggerGen(setup =>
            {
                setup.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
                {
                    Title = "TimeSaverAPI",
                    Version = "v1",
                });
            });


            builder.Services.AddDbContext<TimeSaverContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
          
            var app = builder.Build();

            app.UseSwagger();
            app.UseSwaggerUI();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseCors(options => options.AllowAnyOrigin().AllowAnyHeader());
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.MapControllers();

            app.Run();

        }
    }
}


