using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController(FashionFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rows = await db.Users.OrderBy(u => u.UserId)
            .Select(u => new
            {
                userId = u.UserId,
                u.Name,
                u.Email,
                role = u.Role,
                roleLabel = Roles.RoleLabel(u.Role),
                status = u.Status,
                dashboardKey = u.DashboardKey
            })
            .ToListAsync();
        return Ok(rows);
    }

    // Real account counts for the admin overview's "users by role" chart.
    [HttpGet("by-role")]
    [Authorize(Roles = "Admin,SalesStaff")]
    public async Task<IActionResult> ByRole()
    {
        var staffCounts = await db.Users
            .Where(u => u.Role != "Customer" && u.Role != "Supplier")
            .GroupBy(u => u.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToListAsync();

        var customerCount = await db.Customers.CountAsync();
        var supplierCount = await db.Suppliers.CountAsync();

        var rows = new List<object>
        {
            new { role = "Customers", value = customerCount }
        };
        rows.AddRange(staffCounts.Select(s => new { role = Roles.RoleLabel(s.Role), value = s.Count }));
        rows.Add(new { role = "Suppliers", value = supplierCount });
        return Ok(rows);
    }

    // Invite an account: password is hashed with BCrypt, never stored raw.
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest req)
    {
        var role = req.Role;
        if (!Roles.All.Contains(role))
            return BadRequest(new { message = $"Role must be one of: {string.Join(", ", Roles.All)}." });

        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "An account with that email already exists." });

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 10),
            Role = role,
            DashboardKey = Roles.DashboardKeyFor(role),
            Status = req.Activate ? "Active" : "Invited"
        };
        db.Users.Add(user);
        db.SystemLogs.Add(Audit.Log(User.Email(),
            $"User account invited: {user.Email} ({Roles.RoleLabel(user.Role)})", "System"));
        await db.SaveChangesAsync();
        return StatusCode(201, new { userId = user.UserId, user.Email, user.Status });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var changes = new List<string>();
        if (!string.IsNullOrEmpty(req.Name) && req.Name != user.Name) { user.Name = req.Name.Trim(); changes.Add("name"); }
        if (!string.IsNullOrEmpty(req.Role))
        {
            if (!Roles.All.Contains(req.Role))
                return BadRequest(new { message = "Unknown role." });
            if (req.Role != user.Role)
            {
                user.Role = req.Role;
                user.DashboardKey = Roles.DashboardKeyFor(req.Role);
                changes.Add($"role → {req.Role}");
            }
        }
        if (!string.IsNullOrEmpty(req.Status) && req.Status != user.Status)
        {
            if (req.Status != "Active" && req.Status != "Invited" && req.Status != "Disabled")
                return BadRequest(new { message = "Status must be Active, Invited or Disabled." });
            user.Status = req.Status;
            changes.Add($"status → {req.Status}");
        }

        if (changes.Count > 0)
        {
            db.SystemLogs.Add(Audit.Log(User.Email(), $"User {user.Email} updated: {string.Join(", ", changes)}", "System"));
            await db.SaveChangesAsync();
        }
        return Ok(new { ok = true });
    }
}
