using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FashionFlow.Models;

namespace FashionFlow.Services;

// PayMongo (PH payment gateway) integration. Checkout Sessions host the
// payment page for us; a webhook confirms payment. Keys come from
// user-secrets / environment variables (PayMongo:SecretKey etc.).
public class PayMongoService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<PayMongoService> logger)
{
    private const string ApiBase = "https://api.paymongo.com/v1";

    private string? SecretKey => config["PayMongo:SecretKey"];

    public bool IsConfigured => !string.IsNullOrEmpty(SecretKey);

    // Creates a hosted checkout session for the order. paymentMethodTypes
    // filters which wallets/cards the hosted page offers (from the customer's
    // checkout choice); empty means "let PayMongo show its defaults".
    // Returns (checkoutSessionId, checkoutUrl).
    public async Task<(string SessionId, string CheckoutUrl)> CreateCheckoutSessionAsync(
        Order order,
        IReadOnlyList<(string Name, int Quantity, decimal UnitPrice)> lineItems,
        string successUrl,
        string cancelUrl,
        IReadOnlyList<string>? paymentMethodTypes = null)
    {
        var client = httpFactory.CreateClient("paymongo");
        client.DefaultRequestHeaders.Authorization =
            new("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(SecretKey! + ":")));

        // PayMongo wants integer centavos.
        static int Centavos(decimal v) => (int)Math.Round(v * 100m);

        var body = new
        {
            data = new
            {
                attributes = new
                {
                    line_items = lineItems.Select(li => new
                    {
                        currency = "PHP",
                        amount = Centavos(li.UnitPrice),
                        name = li.Name,
                        quantity = li.Quantity
                    }),
                    payment_method_types = paymentMethodTypes is { Count: > 0 }
                        ? paymentMethodTypes
                        : new[] { "gcash", "maya", "card" },
                    reference_number = order.OrderNumber,
                    description = $"FashionFlow order {order.OrderNumber}",
                    success_url = successUrl,
                    cancel_url = cancelUrl
                }
            }
        };

        var response = await client.PostAsJsonAsync($"{ApiBase}/checkout_sessions", body);
        var raw = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("PayMongo checkout_session failed ({Status}): {Body}", (int)response.StatusCode, raw);
            throw new InvalidOperationException("PayMongo rejected the checkout session — see server logs.");
        }

        using var doc = JsonDocument.Parse(raw);
        var data = doc.RootElement.GetProperty("data");
        return (
            data.GetProperty("id").GetString()!,
            data.GetProperty("attributes").GetProperty("checkout_url").GetString()!
        );
    }

    // Verifies the PayMongo-Signature header: "t=<ts>,te=...,li=...;hmac=<hex>"
    // where hmac = HMACSHA256(webhookSecret, "{t}.{rawBody}").
    public static bool VerifyWebhookSignature(string? webhookSecret, string? signatureHeader, string rawBody)
    {
        if (string.IsNullOrEmpty(webhookSecret) || string.IsNullOrEmpty(signatureHeader))
            return false;

        string? timestamp = null, hmac = null;
        foreach (var part in signatureHeader.Split(';', ','))
        {
            var kv = part.Split('=', 2);
            if (kv.Length != 2) continue;
            if (kv[0].Trim() == "t") timestamp = kv[1].Trim();
            if (kv[0].Trim() == "hmac") hmac = kv[1].Trim();
        }
        if (timestamp is null || hmac is null) return false;

        using var hmacSha = new HMACSHA256(Encoding.UTF8.GetBytes(webhookSecret));
        var expected = Convert.ToHexString(hmacSha.ComputeHash(Encoding.UTF8.GetBytes($"{timestamp}.{rawBody}"))).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(hmac.ToLowerInvariant()));
    }

    // Extracts the checkout session id (cs_xxx) from a webhook payload for the
    // events we care about. PayMongo nests it at attributes.data.id (with the
    // session attributes at attributes.data.attributes).
    public static string? ExtractCheckoutSessionId(string rawBody)
    {
        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement.GetProperty("data");
        var attrs = root.GetProperty("attributes");
        if (attrs.TryGetProperty("data", out var inner) && inner.ValueKind == JsonValueKind.Object)
        {
            if (inner.TryGetProperty("id", out var idEl) && idEl.GetString()?.StartsWith("cs_") == true)
                return idEl.GetString();
            if (inner.TryGetProperty("attributes", out var innerAttrs) &&
                innerAttrs.TryGetProperty("checkout_session_id", out var csEl) &&
                csEl.ValueKind == JsonValueKind.String)
                return csEl.GetString();
        }
        return null;
    }

    public static string? ExtractEventType(string rawBody)
    {
        using var doc = JsonDocument.Parse(rawBody);
        return doc.RootElement.GetProperty("data").GetProperty("attributes").GetProperty("type").GetString();
    }
}
