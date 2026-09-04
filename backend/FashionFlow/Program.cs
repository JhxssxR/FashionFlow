using System.Text;
using System.Threading.RateLimiting;
using FashionFlow.Data;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// SQL Server (Express locally per appsettings, cloud per environment vars).
builder.Services.AddDbContext<FashionFlowDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<TokenService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<SaleService>();
builder.Services.AddScoped<PayMongoService>();
builder.Services.AddScoped<OrderFulfillmentService>();

// JWT bearer auth. Tokens use short claim names and the handler is set to
// MapInboundClaims = false so "role"/"name" arrive exactly as issued.
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwt["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Key"]
                    ?? throw new InvalidOperationException("Jwt:Key is not configured — set it via user-secrets or environment variables."))),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization();

// Brute-force protection on the login endpoint (Logging & Monitoring rubric:
// failures are also written to SystemLogs in AuthController).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "login:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1)
        }));
});

// Consistent ProblemDetails responses for validation failures and exceptions.
builder.Services.AddProblemDetails();

// Vite dev server (5173) may call the API during development; production is
// same-origin (the SPA is served from wwwroot), so CORS is dev-only.
builder.Services.AddCors(options => options.AddPolicy("dev", policy =>
    policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Apply migrations, then seed demo data once on an empty database.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FashionFlowDbContext>();
    await db.Database.MigrateAsync();
    await DbSeed.SeedIfEmptyAsync(db);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRateLimiter();
if (app.Environment.IsDevelopment()) app.UseCors("dev");

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback: hash routing only needs "/", but deep asset misses and
// refreshes should still get the shell. Unknown /api routes stay 404 JSON.
app.MapFallback(async ctx =>
{
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    ctx.Response.ContentType = "text/html";
    await ctx.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html"));
});

app.Run();
