using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FashionFlow.Models;
using Microsoft.IdentityModel.Tokens;

namespace FashionFlow.Services;

// Issues the JWT the SPA stores after login. Claim names are kept short
// ("name", "role", …) because JwtBearer is configured with
// MapInboundClaims = false — see Program.cs.
public class TokenService(IConfiguration config)
{
    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var expires = DateTime.UtcNow.AddHours(8);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new("name", user.Name),
            new("email", user.Email),
            new("role", user.Role),
            new("dashboardKey", user.DashboardKey)
        };
        if (user.CustomerId is int cid) claims.Add(new Claim("customerId", cid.ToString()));
        if (user.SupplierId is int sid) claims.Add(new Claim("supplierId", sid.ToString()));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow.AddSeconds(-5),
            expires: expires,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
                SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
