using FashionFlow.Data;
using FashionFlow.Models;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Services;

// In-app notifications for the bell icon in every dashboard (and the
// storefront header for signed-in customers). Push only queues rows on the
// caller's SaveChanges, so a notification is written in the same transaction
// as the event that caused it — no notifications for rolled-back work.
public static class Notifications
{
    public static void Push(FashionFlowDbContext db, int userId, string title, string body,
        string type = "System", string? link = null) =>
        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Body = body,
            Type = type,
            Link = link
        });

    // Fan out one row per active account holding any of the given roles —
    // e.g. every InventoryManager when a delivery lands in stock.
    public static async Task PushRolesAsync(FashionFlowDbContext db, string[] roles, string title, string body,
        string type = "System", string? link = null)
    {
        var userIds = await db.Users
            .Where(u => roles.Contains(u.Role) && u.Status == "Active")
            .Select(u => u.UserId)
            .ToListAsync();
        foreach (var id in userIds) Push(db, id, title, body, type, link);
    }

    public static Task PushRoleAsync(FashionFlowDbContext db, string role, string title, string body,
        string type = "System", string? link = null) =>
        PushRolesAsync(db, [role], title, body, type, link);
}
