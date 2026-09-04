using FashionFlow.Models;

namespace FashionFlow.Services;

// SystemLog rows are the admin dashboard's activity feed and the
// Logging & Monitoring rubric evidence — every state-changing API call
// writes one.
public static class Audit
{
    public static SystemLog Log(string email, string action, string type) =>
        new() { Time = DateTime.Now, UserEmail = email, Action = action, Type = type };
}
