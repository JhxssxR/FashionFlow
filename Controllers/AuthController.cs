using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

public static class AuthPayload
{
    public static object For(User u) => new
    {
        userId = u.UserId,
        name = u.Name,
        email = u.Email,
        role = u.Role,
        roleLabel = Roles.RoleLabel(u.Role),
        dashboardKey = u.DashboardKey,
        customerId = u.CustomerId,
        supplierId = u.SupplierId,
        initials = ClaimsExtensions.Initials(u.Name)
    };
}

[ApiController]
[Route("api/auth")]
public class AuthController(FashionFlowDbContext db, TokenService tokens, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            db.SystemLogs.Add(Audit.Log(email, "Failed sign-in attempt", "Auth"));
            await db.SaveChangesAsync();
            logger.LogWarning("Failed sign-in for {Email}", email);
            return Unauthorized(new { message = "Incorrect email or password." });
        }

        if (user.Status != "Active")
            return StatusCode(403, new { message = "This account is not active yet — an administrator must activate it first." });

        var (token, expiresAt) = tokens.CreateToken(user);
        db.SystemLogs.Add(Audit.Log(user.Email, $"Signed in ({Roles.RoleLabel(user.Role)})", "Auth"));
        await db.SaveChangesAsync();

        return Ok(new { token, expiresAt, user = AuthPayload.For(user) });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await db.Users.FindAsync(User.UserId());
        return user is null ? Unauthorized(new { message = "Unknown account." }) : Ok(AuthPayload.For(user));
    }
}
