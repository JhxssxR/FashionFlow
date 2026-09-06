using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

// The bell: every signed-in account reads and acknowledges its own
// notifications; admins can additionally broadcast announcements to a role
// (or everyone) for demos and store-wide notices.
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(FashionFlowDbContext db) : ControllerBase
{
    // Latest items + unread count in one call — the dropdown's data shape.
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int take = 15)
    {
        var uid = User.UserId();
        var items = await db.Notifications
            .Where(n => n.UserId == uid)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.NotificationId)
            .Take(Math.Clamp(take, 1, 50))
            .Select(n => new
            {
                id = n.NotificationId,
                n.Title,
                n.Body,
                n.Type,
                n.Link,
                n.IsRead,
                n.CreatedAt
            })
            .ToListAsync();
        var unread = await db.Notifications.CountAsync(n => n.UserId == uid && !n.IsRead);
        return Ok(new { unread, items });
    }

    // Lightweight polling endpoint the bells hit every ~15s.
    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount() =>
        Ok(new { unread = await db.Notifications.CountAsync(n => n.UserId == User.UserId() && !n.IsRead) });

    [HttpPut("read")]
    public async Task<IActionResult> MarkRead(MarkReadRequest req)
    {
        var q = db.Notifications.Where(n => n.UserId == User.UserId() && !n.IsRead);
        if (req.Ids is { Count: > 0 }) q = q.Where(n => req.Ids.Contains(n.NotificationId));
        await q.ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { ok = true });
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await db.Notifications.Where(n => n.UserId == User.UserId() && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { ok = true });
    }

    // Admin announcement: lands in every target account's bell immediately.
    [HttpPost("broadcast")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Broadcast(BroadcastRequest req)
    {
        var role = string.IsNullOrWhiteSpace(req.Role) ? null : req.Role.Trim();
        if (role is not null && !Roles.All.Contains(role))
            return BadRequest(new { message = $"Unknown role '{role}'." });

        var senderId = User.UserId();
        var targets = await db.Users
            .Where(u => u.Status == "Active" && u.UserId != senderId
                        && (role == null || u.Role == role))
            .Select(u => u.UserId)
            .ToListAsync();

        var body = string.IsNullOrWhiteSpace(req.Body) ? "" : req.Body.Trim();
        foreach (var id in targets)
            Notifications.Push(db, id, req.Title.Trim(), body, "System", link: null);
        await db.SaveChangesAsync();

        return Ok(new { delivered = targets.Count });
    }
}
