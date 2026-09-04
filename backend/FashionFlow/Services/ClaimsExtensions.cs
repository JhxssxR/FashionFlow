using System.Security.Claims;

namespace FashionFlow.Services;

public static class ClaimsExtensions
{
    public static int UserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue("sub"), out var id) ? id : 0;

    public static string Email(this ClaimsPrincipal user) =>
        user.FindFirstValue("email") ?? "";

    public static int? CustomerId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue("customerId"), out var id) ? id : null;

    public static int? SupplierId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue("supplierId"), out var id) ? id : null;

    public static string Initials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length == 0 ? "?"
            : string.Concat(parts.Take(2).Select(p => char.ToUpper(p[0])));
    }
}
