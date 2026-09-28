namespace FashionFlow.Services;

// Philippine wall-clock (UTC+8, no DST — a fixed offset is exact forever).
// The servers run in another timezone, so every user-visible day boundary
// and business timestamp goes through here instead of DateTime.Today/Now.
// (JWT lifetimes intentionally stay on DateTime.UtcNow.)
public static class PhTime
{
    public static DateTime Now => DateTime.UtcNow.AddHours(8);
    public static DateTime Today => Now.Date;
    public static DateOnly Date => DateOnly.FromDateTime(Now);
}
