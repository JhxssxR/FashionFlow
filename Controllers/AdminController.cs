using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api")]
[Authorize(Roles = "Admin")]
public class AdminController(FashionFlowDbContext db) : ControllerBase
{
    [HttpGet("logs")]
    public async Task<IActionResult> Logs([FromQuery] int limit = 50)
    {
        var rows = await db.SystemLogs.OrderByDescending(l => l.Time)
            .Take(Math.Clamp(limit, 1, 200))
            .Select(l => new { id = l.LogId, time = l.Time, user = l.UserEmail, action = l.Action, type = l.Type })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpGet("settings")]
    public async Task<IActionResult> Settings()
    {
        var rows = await db.AppSettings.OrderBy(a => a.Key)
            .Select(a => new { a.Key, a.Value })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPut("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] List<SaveSettingRequest> changes)
    {
        foreach (var change in changes)
        {
            var setting = await db.AppSettings.FindAsync(change.Key);
            if (setting is null) continue;
            if (setting.Value == change.Value) continue;
            setting.Value = change.Value;
            db.SystemLogs.Add(Audit.Log(User.Email(),
                $"System setting changed: {change.Key} → {change.Value}", "System"));
        }
        await db.SaveChangesAsync();
        var rows = await db.AppSettings.OrderBy(a => a.Key).Select(a => new { a.Key, a.Value }).ToListAsync();
        return Ok(rows);
    }
}
