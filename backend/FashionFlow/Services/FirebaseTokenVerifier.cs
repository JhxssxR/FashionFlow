using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace FashionFlow.Services;

// Verifies Firebase Authentication ID tokens without the Firebase Admin
// SDK (no service-account key needed): the signature is checked against
// Google's rotating public certs and iss/aud/lifetime are validated.
// Throws InvalidOperationException when the token cannot be trusted.
public sealed record FirebaseAccount(string UserId, string Email, bool EmailVerified, string Name);

public static class FirebaseTokenVerifier
{
    private const string CertUrl =
        "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

    private static readonly HttpClient Http = new();
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static Dictionary<string, string> _certs = new();
    private static DateTime _fetchedAtUtc = DateTime.MinValue;

    public static async Task<FirebaseAccount> VerifyAsync(string idToken, string projectId)
    {
        var handler = new JwtSecurityTokenHandler();
        JwtSecurityToken preview;
        try
        {
            preview = handler.ReadJwtToken(idToken);
        }
        catch
        {
            throw new InvalidOperationException("Malformed sign-in token.");
        }

        var certs = await GetCertsAsync();
        if (string.IsNullOrEmpty(preview.Header.Kid) || !certs.TryGetValue(preview.Header.Kid, out var pem))
            throw new InvalidOperationException("Unknown token signing key.");

        using var cert = X509Certificate2.CreateFromPem(pem);
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{projectId}",
            ValidateAudience = true,
            ValidAudience = projectId,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new X509SecurityKey(cert),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        ClaimsPrincipal principal;
        try
        {
            principal = handler.ValidateToken(idToken, parameters, out _);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Token validation failed: {ex.Message}");
        }

        string Claim(params string[] types) =>
            types.Select(t => principal.FindFirst(t)?.Value)
                .FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? "";
        // NOTE: JwtSecurityTokenHandler may map short JWT names to the long
        // ClaimTypes URIs (e.g. "email" -> ClaimTypes.Email), so check both.
        var email = Claim("email", ClaimTypes.Email, "emails", "upn");
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException(
                "The Google account has no email address " +
                $"(claims present: {string.Join(",", principal.Claims.Select(c => c.Type).Distinct())}).");

        var name = Claim("name", ClaimTypes.Name, "unique_name", "preferred_username");
        if (string.IsNullOrWhiteSpace(name))
            name = email.Split('@')[0];

        return new FirebaseAccount(
            Claim("user_id", JwtRegisteredClaimNames.Sub, ClaimTypes.NameIdentifier),
            email,
            string.Equals(Claim("email_verified"), "true", StringComparison.OrdinalIgnoreCase),
            name.Trim());
    }

    // Google rotates the certs roughly hourly — cache them for 55 minutes.
    private static async Task<Dictionary<string, string>> GetCertsAsync()
    {
        if (_certs.Count > 0 && DateTime.UtcNow - _fetchedAtUtc < TimeSpan.FromMinutes(55))
            return _certs;

        await Gate.WaitAsync();
        try
        {
            if (_certs.Count > 0 && DateTime.UtcNow - _fetchedAtUtc < TimeSpan.FromMinutes(55))
                return _certs;

            using var res = await Http.GetAsync(CertUrl);
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadAsStringAsync();
            _certs = JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new();
            _fetchedAtUtc = DateTime.UtcNow;
            return _certs;
        }
        finally
        {
            Gate.Release();
        }
    }
}
